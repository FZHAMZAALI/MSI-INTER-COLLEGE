// PayU success/failure callback (surl + furl).
// PayU POSTs the transaction result here (browser redirect). We:
//   1. verify the reverse hash with the merchant SALT,
//   2. double-check with PayU's verify_payment API (server-to-server),
//   3. check the amount matches the fee on record,
//   4. update the payment + application, then redirect the parent back
//      to the website.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function sha512(s: string) {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function secret(key: string) {
  const { data } = await sb.from("app_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? "";
}

function back(url: string | null, status: string, regId: string) {
  const target = (url || "") + "#payresult=" + encodeURIComponent(status) + "&reg=" + encodeURIComponent(regId);
  if (!url) {
    return new Response(`<!doctype html><meta charset="utf-8"><title>Payment ${status}</title><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Payment ${status}</h2><p>Registration ID: ${regId}</p><p>You can close this page and open the M.S.I. Inter College student portal.</p></body>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  return new Response(null, { status: 303, headers: { Location: target } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const form = await req.formData().catch(() => null);
  if (!form) return new Response("Bad request", { status: 400 });
  const f: Record<string, string> = {};
  form.forEach((v, k) => { f[k] = String(v); });

  const txnid = f.txnid || "";
  const { data: pay } = await sb.from("payments").select("*").eq("txnid", txnid).maybeSingle();
  if (!pay) return new Response("Unknown transaction", { status: 404 });
  if (pay.status === "success") return back(pay.return_url, "success", pay.reg_id);

  const key = await secret("payu_key"), salt = await secret("payu_salt");
  // Reverse hash: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  let seq = [salt, f.status, "", "", "", "", "", f.udf5 || "", f.udf4 || "", f.udf3 || "", f.udf2 || "", f.udf1 || "",
    f.email, f.firstname, f.productinfo, f.amount, f.txnid, f.key].join("|");
  if (f.additionalCharges) seq = f.additionalCharges + "|" + seq;
  const hashOk = f.key === key && (await sha512(seq)) === (f.hash || "").toLowerCase();

  // Server-to-server confirmation
  let verified = false, verifyRaw: unknown = null;
  if (hashOk && f.status === "success") {
    const live = pay.mode === "live";
    const url = live ? "https://info.payu.in/merchant/postservice.php?form=2" : "https://test.payu.in/merchant/postservice.php?form=2";
    const body = new URLSearchParams({ key, command: "verify_payment", var1: txnid, hash: await sha512([key, "verify_payment", txnid, salt].join("|")) });
    try {
      const r = await fetch(url, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      verifyRaw = await r.json();
      const t = (verifyRaw as any)?.transaction_details?.[txnid];
      verified = t?.status === "success" && Math.abs(Number(t.amt ?? t.amount) - Number(pay.amount)) < 0.01;
    } catch (e) { console.error("verify_payment failed", e); }
  }

  const { data: app } = await sb.from("applications").select("status,history,fee_total").eq("reg_id", pay.reg_id).single();
  const amountOk = Math.abs(Number(f.amount) - Number(pay.amount)) < 0.01;
  const now = new Date().toISOString();
  let result: "success" | "failure" | "pending";
  if (hashOk && verified && amountOk) result = "success";
  else if (hashOk && f.status === "success") result = "pending";   // gateway said success but we could not confirm yet
  else result = "failure";

  await sb.from("payments").update({ status: result, gateway_ref: f.mihpayid || null, raw: { callback: f, verify: verifyRaw, hashOk }, updated_at: now }).eq("txnid", txnid);
  const note = result === "success" ? `Fee ₹${pay.amount} paid online via PayU (${f.mihpayid || txnid})`
    : result === "pending" ? `PayU payment ${txnid} awaiting confirmation`
    : `PayU payment ${txnid} failed${f.error_Message ? ": " + f.error_Message : ""}`;
  const fields: Record<string, unknown> = { history: [...(app?.history ?? []), { at: now, status: app?.status, note }], updated_at: now };
  if (result === "success") Object.assign(fields, { payment_status: "paid", payment_method: "PayU (" + (f.mode || "online") + ")", payment_ref: f.mihpayid || txnid, paid_at: now });
  else if (result === "failure") fields.payment_status = "failed";
  else fields.payment_status = "pending";
  await sb.from("applications").update(fields).eq("reg_id", pay.reg_id);

  return back(pay.return_url, result, pay.reg_id);
});
