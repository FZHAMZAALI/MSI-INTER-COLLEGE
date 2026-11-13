// M.S.I. Inter College — main API (Supabase Edge Function)
// ---------------------------------------------------------------------------
// Every read/write from the website goes through this function. It
//   • verifies Google ID tokens (Sign in with Google) for parents and staff,
//   • checks staff roles for admin actions,
//   • talks to Postgres + Storage with the service role (tables have RLS on
//     and no policies, so the public key cannot touch them directly),
//   • prepares PayU payments (hash is computed here; the salt never leaves
//     the server).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const FN_BASE = Deno.env.get("SUPABASE_URL")! + "/functions/v1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-id-token, apikey, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
const bad = (msg: string, status = 400) => { throw new HttpError(status, msg); };

/* ------------------------------------------------------------ helpers -- */
async function setting<T = any>(key: string, fallback: T): Promise<T> {
  const { data } = await sb.from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value ?? fallback) as T;
}
async function secret(key: string): Promise<string> {
  const { data } = await sb.from("app_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? "";
}
async function sha(algo: "SHA-256" | "SHA-512", s: string) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const normPhone = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-10);
const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const rand = (n: number) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(a, (x) => chars[x % chars.length]).join("");
};

const CLASS_GROUP: Record<string, string> = {
  "Class 6": "middle", "Class 7": "middle", "Class 8": "middle",
  "Class 9": "high", "Class 10": "high", "Class 11": "inter", "Class 12": "inter",
};
const STREAMS = ["Science (PCM)", "Science (PCB)", "Commerce", "Arts"];

/* -------------------------------------------- Google ID tokens (GIS) -- */
// Sign-in uses Google Identity Services ("Sign in with Google" + One Tap).
// The browser sends Google's ID token; we verify its signature, issuer and
// audience (our OAuth Client ID) against Google's public keys.
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
type User = { uid: string; email: string; name: string; picture: string };

async function googleUser(req: Request): Promise<User | null> {
  const token = req.headers.get("x-id-token");
  if (!token) return null;
  const g = await setting<{ clientId?: string }>("google", {});
  if (!g.clientId) bad("Google Sign-in is not configured yet", 503);
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: g.clientId,
    });
    if (!payload.sub || !payload.email || payload.email_verified === false) bad("Unverified Google account", 401);
    return { uid: "g:" + String(payload.sub), email: String(payload.email).toLowerCase(), name: String(payload.name ?? ""), picture: String(payload.picture ?? "") };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    bad("Session expired — please sign in again", 401);
  }
  return null;
}
async function requireUser(req: Request) {
  const u = await googleUser(req);
  if (!u) bad("Please sign in with Google", 401);
  return u!;
}
async function requireStaff(req: Request, adminOnly = false) {
  const u = await requireUser(req);
  const { data } = await sb.from("staff").select("role,name").eq("email", u.email).maybeSingle();
  if (!data) bad("This Google account is not authorised for the admin panel", 403);
  if (adminOnly && data.role !== "admin") bad("Only administrators can do this", 403);
  return { ...u, role: data.role as string };
}

/* ------------------------------------------------------------ uploads -- */
async function saveDataUrl(bucket: string, path: string, dataUrl: string) {
  const m = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,(.+)$/.exec(String(dataUrl || ""));
  if (!m) bad("Unsupported file type — use JPG, PNG or PDF");
  const bytes = Uint8Array.from(atob(m![2]), (c) => c.charCodeAt(0));
  if (bytes.length > 5 * 1024 * 1024) bad("File too large (max 5 MB)");
  const ext = m![1] === "application/pdf" ? "pdf" : m![1] === "image/png" ? "png" : m![1] === "image/webp" ? "webp" : "jpg";
  const full = `${path}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(full, bytes, { contentType: m![1], upsert: true });
  if (error) bad("Upload failed: " + error.message, 500);
  return full;
}

/* -------------------------------------------------------- applications -- */
function publicApp(a: any) {
  if (!a) return null;
  return {
    regId: a.reg_id, session: a.session, status: a.status, paymentStatus: a.payment_status,
    feeTotal: a.fee_total, feeBreakup: a.fee_breakup, studentName: a.student_name, fatherName: a.father_name,
    phone: a.phone, email: a.email, applyClass: a.apply_class, stream: a.stream, data: a.data,
    history: a.history, paymentMethod: a.payment_method, paymentRef: a.payment_ref, paidAt: a.paid_at,
    createdAt: a.created_at, updatedAt: a.updated_at,
  };
}
async function addHistory(regId: string, entry: Record<string, unknown>, fields: Record<string, unknown> = {}) {
  const { data: a } = await sb.from("applications").select("history").eq("reg_id", regId).single();
  const history = [...(a?.history ?? []), { at: new Date().toISOString(), ...entry }];
  const { error } = await sb.from("applications").update({ ...fields, history, updated_at: new Date().toISOString() }).eq("reg_id", regId);
  if (error) bad(error.message, 500);
}

async function submitApplication(u: User, p: any) {
  const open = await setting<boolean>("admissions_open", true);
  if (!open) bad("Admissions are currently closed");
  const d = p.data ?? {};
  const cls = str(d.applyClass, 20);
  const group = CLASS_GROUP[cls];
  if (!group) bad("Please choose a valid class (6–12)");
  const stream = group === "inter" ? str(d.stream, 30) : "";
  if (group === "inter" && !STREAMS.includes(stream)) bad("Please choose a stream for Class 11/12");
  const phone = normPhone(d.phone);
  if (!/^[6-9]\d{9}$/.test(phone)) bad("Invalid mobile number");
  if (str(d.studentName).length < 3 || str(d.fatherName).length < 3) bad("Student and father's names are required");
  if (!p.files?.photo) bad("Student photograph is required");

  const { count } = await sb.from("applications").select("id", { count: "exact", head: true }).eq("uid", u.uid);
  if ((count ?? 0) >= 5) bad("Maximum 5 applications per account");

  const fees = await setting<Record<string, Record<string, number>>>("fees", {});
  const f = fees[group] ?? {};
  const feeTotal = Object.values(f).reduce((s, n) => s + (Number(n) || 0), 0);
  const session = await setting<string>("session", "");
  const regId = "MSI" + String(new Date().getFullYear()).slice(-2) + "-" + rand(6);

  const allowed = ["studentName", "dob", "aadhaar", "category", "religion", "nationality", "bloodGroup", "medium",
    "fatherName", "motherName", "guardianOccupation", "annualIncome", "phone", "altPhone", "email",
    "address", "city", "pincode", "prevSchool", "prevBoard", "prevClass", "prevPercent", "hostel", "applyClass", "stream"];
  const data: Record<string, string> = {};
  for (const k of allowed) if (d[k] != null && d[k] !== "") data[k] = str(d[k], 400);
  data.stream = stream; data.phone = phone;

  const files: Record<string, string> = {};
  for (const k of ["photo", "marksheet", "aadhaarDoc", "tc", "birthCert"]) {
    if (p.files?.[k]) files[k] = await saveDataUrl("applicant-docs", `${regId}/${k}`, p.files[k]);
  }
  const row = {
    reg_id: regId, uid: u.uid, session, fee_total: feeTotal, fee_breakup: f,
    student_name: data.studentName, father_name: data.fatherName, phone, email: str(d.email || u.email, 120).toLowerCase(),
    apply_class: cls, stream: stream || null, data, files,
    history: [{ at: new Date().toISOString(), status: "submitted", note: "Application received online" }],
  };
  const { data: ins, error } = await sb.from("applications").insert(row).select().single();
  if (error) bad(error.message, 500);
  return publicApp(ins);
}

/* --------------------------------------------------------------- PayU -- */
async function payuInit(u: User, p: any) {
  const pay = await setting<any>("payment", {});
  const key = await secret("payu_key"), salt = await secret("payu_salt");
  if (!pay.payuEnabled || !key || !salt) bad("Online payment is not enabled yet — please pay at the college office");
  const { data: a } = await sb.from("applications").select("*").eq("reg_id", str(p.regId, 20)).maybeSingle();
  if (!a || a.uid !== u.uid) bad("Application not found", 404);
  if (a.payment_status === "paid") bad("Fee already paid");
  if (!(a.fee_total > 0)) bad("No fee is due");

  let returnUrl = str(p.returnUrl, 500);
  try { const ru = new URL(returnUrl); if (!/^https?:$/.test(ru.protocol)) returnUrl = ""; } catch { returnUrl = ""; }

  const txnid = "MSI" + Date.now().toString(36).toUpperCase() + rand(4);
  const amount = Number(a.fee_total).toFixed(2);
  const productinfo = "Admission fee " + a.reg_id;
  const firstname = (a.father_name || a.student_name || "Parent").replace(/[^A-Za-z .]/g, "").slice(0, 60) || "Parent";
  const email = a.email || u.email;
  const phone = a.phone;
  const udf1 = a.reg_id;
  const hash = await sha("SHA-512", [key, txnid, amount, productinfo, firstname, email, udf1, "", "", "", "", "", "", "", "", "", salt].join("|"));

  const { error } = await sb.from("payments").insert({ txnid, reg_id: a.reg_id, amount, mode: pay.payuMode, return_url: returnUrl, created_by: u.uid });
  if (error) bad(error.message, 500);
  await addHistory(a.reg_id, { status: a.status, note: "Online payment started (" + txnid + ")" }, { payment_status: "pending" });

  return {
    action: pay.payuMode === "live" ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment",
    fields: {
      key, txnid, amount, productinfo, firstname, email, phone, udf1, hash,
      surl: FN_BASE + "/payu", furl: FN_BASE + "/payu",
    },
  };
}

/* ------------------------------------------------------- admin: CRUD -- */
const CRUD: Record<string, string[]> = {
  notices: ["title", "body", "category", "link_url", "file_url", "is_new", "active", "published_on"],
  gallery: ["url", "caption", "category", "sort"],
  toppers: ["name", "exam", "stream", "percent", "rank_text", "year", "photo_url", "sort"],
  leaders: ["name", "role", "message", "photo_url", "sort"],
};
const PUBLIC_SETTINGS = ["session", "admissions_open", "contact", "ticker", "fees", "stats", "maps", "payment", "google", "about"];

/* --------------------------------------------------------------- router -- */
async function handle(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const p = body;

  switch (action) {
    /* ---------- public ---------- */
    case "public.site": {
      const [st, notices, gallery, toppers, leaders] = await Promise.all([
        sb.from("settings").select("key,value").eq("is_public", true),
        sb.from("notices").select("id,title,body,category,link_url,file_url,is_new,published_on").eq("active", true).order("published_on", { ascending: false }).limit(30),
        sb.from("gallery").select("id,url,caption,category").order("sort").limit(200),
        sb.from("toppers").select("id,name,exam,stream,percent,rank_text,year,photo_url").order("sort").limit(40),
        sb.from("leaders").select("id,name,role,message,photo_url").order("sort").limit(12),
      ]);
      const settings: Record<string, unknown> = {};
      for (const r of st.data ?? []) settings[r.key] = r.value;
      return { settings, notices: notices.data ?? [], gallery: gallery.data ?? [], toppers: toppers.data ?? [], leaders: leaders.data ?? [] };
    }
    case "public.enquiry": {
      const name = str(p.name, 80), phone = normPhone(p.phone), message = str(p.message, 1000);
      if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone) || message.length < 3) bad("Please fill name, a valid mobile and message");
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await sb.from("enquiries").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since);
      if ((count ?? 0) >= 3) bad("Too many messages — please call the office");
      const { error } = await sb.from("enquiries").insert({ name, phone, subject: str(p.subject, 60), message });
      if (error) bad(error.message, 500);
      return { ok: true };
    }
    case "public.track": {
      const { data } = await sb.from("applications").select("*").eq("reg_id", str(p.regId, 20).toUpperCase()).eq("phone", normPhone(p.phone)).maybeSingle();
      if (!data) return { application: null };
      const a = publicApp(data)!;
      delete (a as any).data; delete (a as any).email;
      return { application: a };
    }

    /* ---------- signed-in parent ---------- */
    case "me": {
      const u = await requireUser(req);
      await sb.from("profiles").upsert({ uid: u.uid, email: u.email, name: u.name, photo_url: u.picture, last_login: new Date().toISOString() });
      const { data: s } = await sb.from("staff").select("role").eq("email", u.email).maybeSingle();
      return { user: u, staffRole: s?.role ?? null };
    }
    case "apps.mine": {
      const u = await requireUser(req);
      const { data } = await sb.from("applications").select("*").eq("uid", u.uid).order("created_at", { ascending: false });
      const apps = await Promise.all((data ?? []).map(async (a) => {
        const pa: any = publicApp(a);
        if (a.files?.photo) pa.photoUrl = (await sb.storage.from("applicant-docs").createSignedUrl(a.files.photo, 3600)).data?.signedUrl;
        return pa;
      }));
      return { applications: apps };
    }
    case "apps.submit": {
      const u = await requireUser(req);
      await sb.from("profiles").upsert({ uid: u.uid, email: u.email, name: u.name, photo_url: u.picture, last_login: new Date().toISOString() });
      return { application: await submitApplication(u, p) };
    }
    case "pay.init": return await payuInit(await requireUser(req), p);
    case "pay.office": {
      const u = await requireUser(req);
      const { data: a } = await sb.from("applications").select("reg_id,uid,status,payment_status").eq("reg_id", str(p.regId, 20)).maybeSingle();
      if (!a || a.uid !== u.uid) bad("Application not found", 404);
      if (a.payment_status === "paid") bad("Fee already paid");
      await addHistory(a.reg_id, { status: a.status, note: "Parent chose to pay at the college office" }, { payment_status: "office", payment_method: "At office" });
      return { ok: true };
    }

    /* ---------- staff ---------- */
    case "admin.bootstrap": {
      const u = await requireUser(req);
      const { count } = await sb.from("staff").select("email", { count: "exact", head: true }).eq("role", "admin");
      const stored = await secret("admin_setup_code_sha256");
      if (!stored) bad("Setup code already used");
      if ((await sha("SHA-256", str(p.code, 100).toUpperCase())) !== stored) bad("Invalid setup code", 403);
      await sb.from("staff").upsert({ email: u.email, name: u.name, role: "admin" });
      await sb.from("app_secrets").delete().eq("key", "admin_setup_code_sha256");
      return { ok: true, admins: (count ?? 0) + 1 };
    }
    case "admin.stats": {
      await requireStaff(req);
      const { data: apps } = await sb.from("applications").select("status,payment_status,fee_total,apply_class,created_at");
      const { count: enq } = await sb.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
      const { count: users } = await sb.from("profiles").select("uid", { count: "exact", head: true });
      return { apps: apps ?? [], newEnquiries: enq ?? 0, users: users ?? 0 };
    }
    case "admin.apps.list": {
      await requireStaff(req);
      const { data, error } = await sb.from("applications").select("reg_id,session,status,payment_status,fee_total,student_name,father_name,phone,email,apply_class,stream,payment_method,payment_ref,paid_at,created_at").order("created_at", { ascending: false }).limit(2000);
      if (error) bad(error.message, 500);
      return { applications: data };
    }
    case "admin.apps.get": {
      await requireStaff(req);
      const { data: a } = await sb.from("applications").select("*").eq("reg_id", str(p.regId, 20)).maybeSingle();
      if (!a) bad("Not found", 404);
      const urls: Record<string, string> = {};
      for (const [k, path] of Object.entries(a.files ?? {})) {
        urls[k] = (await sb.storage.from("applicant-docs").createSignedUrl(String(path), 3600)).data?.signedUrl ?? "";
      }
      const { data: pays } = await sb.from("payments").select("txnid,amount,status,gateway,gateway_ref,mode,created_at").eq("reg_id", a.reg_id).order("created_at", { ascending: false });
      return { application: { ...a, fileUrls: urls }, payments: pays ?? [] };
    }
    case "admin.apps.update": {
      const s = await requireStaff(req);
      const status = str(p.status, 20);
      if (!["submitted", "review", "approved", "rejected"].includes(status)) bad("Invalid status");
      await addHistory(str(p.regId, 20), { status, note: str(p.note, 500), by: s.email }, { status });
      return { ok: true };
    }
    case "admin.apps.cash": {
      const s = await requireStaff(req);
      const regId = str(p.regId, 20), receipt = str(p.receiptNo, 40);
      if (!receipt) bad("Enter the office receipt number");
      const { data: a } = await sb.from("applications").select("status,fee_total,payment_status").eq("reg_id", regId).single();
      if (!a) bad("Not found", 404);
      if (a.payment_status === "paid") bad("Already paid");
      await sb.from("payments").insert({ txnid: "CASH-" + receipt + "-" + rand(3), reg_id: regId, amount: a.fee_total, gateway: "office", status: "cash", gateway_ref: receipt, created_by: s.email });
      await addHistory(regId, { status: a.status, note: "Fee ₹" + a.fee_total + " received at office, receipt " + receipt, by: s.email },
        { payment_status: "paid", payment_method: "Cash at office", payment_ref: receipt, paid_at: new Date().toISOString() });
      return { ok: true };
    }
    case "admin.apps.delete": {
      await requireStaff(req, true);
      const regId = str(p.regId, 20);
      const { data: a } = await sb.from("applications").select("files").eq("reg_id", regId).maybeSingle();
      if (a?.files) await sb.storage.from("applicant-docs").remove(Object.values(a.files).map(String));
      await sb.from("applications").delete().eq("reg_id", regId);
      return { ok: true };
    }
    case "admin.payments.list": {
      await requireStaff(req);
      const { data } = await sb.from("payments").select("txnid,reg_id,amount,gateway,status,gateway_ref,mode,created_at").order("created_at", { ascending: false }).limit(1000);
      return { payments: data ?? [] };
    }
    case "admin.crud.list": {
      await requireStaff(req);
      const t = str(p.table, 20); if (!CRUD[t]) bad("Unknown table");
      const order = t === "notices" ? "published_on" : "sort";
      const { data } = await sb.from(t).select("*").order(order, { ascending: t !== "notices" }).limit(500);
      return { rows: data ?? [] };
    }
    case "admin.crud.save": {
      await requireStaff(req);
      const t = str(p.table, 20); if (!CRUD[t]) bad("Unknown table");
      const row: Record<string, unknown> = {};
      for (const k of CRUD[t]) if (k in (p.row ?? {})) row[k] = p.row[k] === "" ? null : p.row[k];
      const q = p.row?.id ? sb.from(t).update(row).eq("id", p.row.id) : sb.from(t).insert(row);
      const { error } = await q;
      if (error) bad(error.message, 400);
      return { ok: true };
    }
    case "admin.crud.delete": {
      await requireStaff(req);
      const t = str(p.table, 20); if (!CRUD[t]) bad("Unknown table");
      const { error } = await sb.from(t).delete().eq("id", str(p.id, 60));
      if (error) bad(error.message, 400);
      return { ok: true };
    }
    case "admin.upload": {
      await requireStaff(req);
      const folder = ["gallery", "notices", "toppers", "leaders"].includes(p.folder) ? p.folder : "misc";
      const path = await saveDataUrl("site-media", `${folder}/${Date.now()}-${rand(5)}`, p.file);
      return { url: sb.storage.from("site-media").getPublicUrl(path).data.publicUrl };
    }
    case "admin.enquiries.list": {
      await requireStaff(req);
      const { data } = await sb.from("enquiries").select("*").order("created_at", { ascending: false }).limit(1000);
      return { rows: data ?? [] };
    }
    case "admin.enquiries.update": {
      await requireStaff(req);
      await sb.from("enquiries").update({ status: p.status === "resolved" ? "resolved" : "new" }).eq("id", str(p.id, 60));
      return { ok: true };
    }
    case "admin.users.list": {
      await requireStaff(req);
      const { data } = await sb.from("profiles").select("uid,email,name,photo_url,created_at,last_login").order("created_at", { ascending: false }).limit(2000);
      return { rows: data ?? [] };
    }
    case "admin.settings.get": {
      await requireStaff(req);
      const { data } = await sb.from("settings").select("key,value");
      const out: Record<string, unknown> = {};
      for (const r of data ?? []) out[r.key] = r.value;
      out.payuKeySet = !!(await secret("payu_key"));
      out.payuSaltSet = !!(await secret("payu_salt"));
      return { settings: out };
    }
    case "admin.settings.save": {
      await requireStaff(req, true);
      const allowed = ["session", "admissions_open", "contact", "ticker", "fees", "stats", "maps", "payment", "about"];
      for (const [k, v] of Object.entries(p.settings ?? {})) {
        if (!allowed.includes(k)) continue;
        await sb.from("settings").upsert({ key: k, value: v, is_public: PUBLIC_SETTINGS.includes(k), updated_at: new Date().toISOString() });
      }
      if (p.payuKey) await sb.from("app_secrets").upsert({ key: "payu_key", value: str(p.payuKey, 100) });
      if (p.payuSalt) await sb.from("app_secrets").upsert({ key: "payu_salt", value: str(p.payuSalt, 200) });
      return { ok: true };
    }
    case "admin.staff.list": {
      await requireStaff(req);
      const { data } = await sb.from("staff").select("*").order("created_at");
      return { rows: data ?? [] };
    }
    case "admin.staff.save": {
      await requireStaff(req, true);
      const email = str(p.email, 120).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bad("Invalid email");
      await sb.from("staff").upsert({ email, name: str(p.name, 80), role: p.role === "admin" ? "admin" : "staff" });
      return { ok: true };
    }
    case "admin.staff.delete": {
      const s = await requireStaff(req, true);
      const email = str(p.email, 120).toLowerCase();
      if (email === s.email) bad("You cannot remove yourself");
      await sb.from("staff").delete().eq("email", email);
      return { ok: true };
    }
    default: bad("Unknown action: " + action, 404);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  try {
    const out = await handle(req);
    return json({ ok: true, ...(out as object) });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, status);
  }
});
