// M.S.I. Inter College — API Worker (Cloudflare Workers + D1 + R2)
// ---------------------------------------------------------------------------
//   POST /api            JSON actions (public, parent, staff)
//   POST /payu           PayU success/failure callback (verified server-side)
//   PUT  /upload?t=…     direct file upload using a signed, short-lived ticket
//   GET  /media/<key>    public site media (gallery, notices, toppers…)
//   GET  /doc/<key>?…    private applicant document via a signed, expiring link
//
// Sign-in: Google Identity Services ID tokens, verified with Google's public
// keys (RS256) — no third-party auth service. PayU hashes are computed here;
// the salt never leaves the server.

export interface Env {
  DB: D1Database;
  DOCS: R2Bucket;          // private applicant documents
  MEDIA: R2Bucket;         // public website media
  SIGNING_KEY: string;     // secret for upload tickets and document links
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-id-token, apikey, authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
const bad = (msg: string, status = 400): never => { throw new HttpError(status, msg); };

/* ------------------------------------------------------------------ utils -- */
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha = async (algo: "SHA-256" | "SHA-512", s: string) => hex(await crypto.subtle.digest(algo, enc.encode(s)));
const b64u = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
const normPhone = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-10);
const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const rand = (n: number) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => chars[x % chars.length]).join("");
};
const parse = <T>(v: unknown, fb: T): T => { try { return v == null ? fb : JSON.parse(String(v)); } catch { return fb; } };

let hmacKey: CryptoKey | null = null;
async function sign(env: Env, msg: string) {
  hmacKey ??= await crypto.subtle.importKey("raw", enc.encode(env.SIGNING_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, enc.encode(msg)))));
}
const safeEq = (a: string, b: string) => a.length === b.length && [...a].reduce((x, c, i) => x | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

/* ---------------------------------------------------------------- data -- */
async function setting<T>(env: Env, key: string, fb: T): Promise<T> {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  return r ? parse<T>(r.value, fb) : fb;
}
async function secret(env: Env, key: string) {
  const r = await env.DB.prepare("SELECT value FROM app_secrets WHERE key = ?").bind(key).first<{ value: string }>();
  return r?.value ?? "";
}

/* ------------------------------------------------- Google ID tokens -- */
type User = { uid: string; email: string; name: string; picture: string };
let jwks: { keys: JsonWebKey[]; exp: number } | null = null;
async function googleKeys() {
  if (jwks && jwks.exp > Date.now()) return jwks.keys;
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  const maxAge = Number((r.headers.get("cache-control") || "").match(/max-age=(\d+)/)?.[1] || 3600);
  jwks = { keys: ((await r.json()) as { keys: JsonWebKey[] }).keys, exp: Date.now() + maxAge * 1000 };
  return jwks.keys;
}
async function googleUser(env: Env, req: Request): Promise<User | null> {
  const token = req.headers.get("x-id-token");
  if (!token) return null;
  const g = await setting<{ clientId?: string }>(env, "google", {});
  if (!g.clientId) bad("Google Sign-in is not configured yet", 503);
  const parts = token.split(".");
  if (parts.length !== 3) bad("Session expired — please sign in again", 401);
  try {
    const header = JSON.parse(unb64u(parts[0])), payload = JSON.parse(unb64u(parts[1]));
    if (header.alg !== "RS256") throw 0;
    const jwk = (await googleKeys()).find((k: any) => k.kid === header.kid);
    if (!jwk) throw 0;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const sig = Uint8Array.from(unb64u(parts[2]), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, enc.encode(parts[0] + "." + parts[1]));
    const t = Date.now() / 1000;
    if (!ok || !["https://accounts.google.com", "accounts.google.com"].includes(payload.iss) || payload.aud !== g.clientId ||
        payload.exp < t - 30 || (payload.iat && payload.iat > t + 300)) throw 0;
    if (!payload.sub || !payload.email || payload.email_verified === false) bad("Unverified Google account", 401);
    return { uid: "g:" + payload.sub, email: String(payload.email).toLowerCase(), name: String(payload.name ?? ""), picture: String(payload.picture ?? "") };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    return bad("Session expired — please sign in again", 401);
  }
}
async function requireUser(env: Env, req: Request) {
  return (await googleUser(env, req)) ?? bad("Please sign in with Google", 401);
}
async function requireStaff(env: Env, req: Request, adminOnly = false) {
  const u = await requireUser(env, req);
  const s = await env.DB.prepare("SELECT role FROM staff WHERE email = ?").bind(u.email).first<{ role: string }>();
  if (!s) bad("This Google account is not authorised for the admin panel", 403);
  if (adminOnly && s!.role !== "admin") bad("Only administrators can do this", 403);
  return { ...u, role: s!.role };
}
async function touchProfile(env: Env, u: User) {
  await env.DB.prepare(`INSERT INTO profiles (uid, email, name, photo_url, last_login) VALUES (?1, ?2, ?3, ?4, ?5)
    ON CONFLICT(uid) DO UPDATE SET email = ?2, name = ?3, photo_url = ?4, last_login = ?5`).bind(u.uid, u.email, u.name, u.picture, now()).run();
}

/* ------------------------------------------------- uploads & links -- */
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
async function ticket(env: Env, base: string, bucket: "docs" | "media", key: string, max: number) {
  const t = b64u(JSON.stringify({ b: bucket, k: key, m: max, e: Date.now() + 15 * 60_000 }));
  return { key, uploadUrl: base + "/upload?t=" + t + "." + (await sign(env, "up:" + t)) };
}
async function docLink(env: Env, base: string, key: string, ttl = 3600) {
  const exp = Date.now() + ttl * 1000;
  return base + "/doc/" + key.split("/").map(encodeURIComponent).join("/") + "?exp=" + exp + "&sig=" + (await sign(env, "doc:" + key + ":" + exp));
}
const mediaUrl = (base: string, key: string) => base + "/media/" + key;

async function handleUpload(env: Env, req: Request, url: URL) {
  const [t, s] = String(url.searchParams.get("t") || "").split(".");
  if (!t || !s || !safeEq(await sign(env, "up:" + t), s)) bad("Invalid upload link", 403);
  const tk = parse<{ b: string; k: string; m: number; e: number }>(unb64u(t), { b: "", k: "", m: 0, e: 0 });
  if (tk.e < Date.now()) bad("Upload link expired — please try again", 403);
  const type = (req.headers.get("content-type") || "").split(";")[0].trim();
  if (!MIME_EXT[type]) bad("Unsupported file type — use JPG, PNG or PDF");
  const len = Number(req.headers.get("content-length") || 0);
  if (!len || len > tk.m) bad("File too large (max " + Math.round(tk.m / 1048576) + " MB)");
  const key = tk.k + "." + MIME_EXT[type];
  const bucket = tk.b === "media" ? env.MEDIA : env.DOCS;
  await bucket.put(key, req.body, { httpMetadata: { contentType: type, cacheControl: tk.b === "media" ? "public, max-age=31536000, immutable" : "private, no-store" } });
  return { key, url: tk.b === "media" ? mediaUrl(url.origin, key) : null };
}
async function serveObject(bucket: R2Bucket, key: string, publicCache: boolean) {
  const obj = await bucket.get(key);
  if (!obj) return new Response("Not found", { status: 404, headers: CORS });
  const h = new Headers(CORS);
  obj.writeHttpMetadata(h);
  h.set("ETag", obj.httpEtag);
  h.set("Cache-Control", publicCache ? "public, max-age=31536000, immutable" : "private, max-age=600");
  h.set("X-Content-Type-Options", "nosniff");
  return new Response(obj.body, { headers: h });
}

/* ------------------------------------------------------ applications -- */
const CLASS_GROUP: Record<string, string> = {
  "Class 6": "middle", "Class 7": "middle", "Class 8": "middle", "Class 9": "high", "Class 10": "high", "Class 11": "inter", "Class 12": "inter",
};
const STREAMS = ["Science (PCM)", "Science (PCB)", "Commerce", "Arts"];
const FILE_KINDS = ["photo", "marksheet", "aadhaarDoc", "tc", "birthCert"];
const uidPath = (uid: string) => uid.replace(/[^A-Za-z0-9_-]/g, "_");

function row(a: any) {
  if (!a) return null;
  return { ...a, fee_breakup: parse(a.fee_breakup, {}), data: parse(a.data, {}), files: parse(a.files, {}), history: parse(a.history, []) };
}
function publicApp(a: any) {
  if (!a) return null;
  return {
    regId: a.reg_id, session: a.session, status: a.status, paymentStatus: a.payment_status, feeTotal: a.fee_total, feeBreakup: a.fee_breakup,
    studentName: a.student_name, fatherName: a.father_name, phone: a.phone, email: a.email, applyClass: a.apply_class, stream: a.stream,
    data: a.data, history: a.history, paymentMethod: a.payment_method, paymentRef: a.payment_ref, paidAt: a.paid_at,
    createdAt: a.created_at, updatedAt: a.updated_at,
  };
}
async function getApp(env: Env, regId: string) {
  return row(await env.DB.prepare("SELECT * FROM applications WHERE reg_id = ?").bind(regId).first());
}
async function addHistory(env: Env, regId: string, entry: Record<string, unknown>, fields: Record<string, unknown> = {}) {
  const a = await getApp(env, regId);
  if (!a) bad("Not found", 404);
  const history = [...a!.history, { at: now(), ...entry }];
  const cols = { ...fields, history: JSON.stringify(history), updated_at: now() };
  const keys = Object.keys(cols);
  await env.DB.prepare(`UPDATE applications SET ${keys.map((k, i) => `${k} = ?${i + 1}`).join(", ")} WHERE reg_id = ?${keys.length + 1}`)
    .bind(...Object.values(cols), regId).run();
}

async function submitApplication(env: Env, u: User, p: any) {
  if (!(await setting(env, "admissions_open", true))) bad("Admissions are currently closed");
  const d = p.data ?? {};
  const cls = str(d.applyClass, 20), group = CLASS_GROUP[cls];
  if (!group) bad("Please choose a valid class (6–12)");
  const stream = group === "inter" ? str(d.stream, 30) : "";
  if (group === "inter" && !STREAMS.includes(stream)) bad("Please choose a stream for Class 11/12");
  const phone = normPhone(d.phone);
  if (!/^[6-9]\d{9}$/.test(phone)) bad("Invalid mobile number");
  if (str(d.studentName).length < 3 || str(d.fatherName).length < 3) bad("Student and father's names are required");

  // Files were uploaded directly to R2 with tickets bound to this user's folder.
  const prefix = "apps/" + uidPath(u.uid) + "/";
  const files: Record<string, string> = {};
  for (const k of FILE_KINDS) {
    const key = str(p.files?.[k], 200);
    if (!key) continue;
    if (!key.startsWith(prefix) || !(await env.DOCS.head(key))) bad("Uploaded file not found — please upload " + k + " again");
    files[k] = key;
  }
  if (!files.photo) bad("Student photograph is required");

  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM applications WHERE uid = ?").bind(u.uid).first<{ n: number }>();
  if ((n?.n ?? 0) >= 5) bad("Maximum 5 applications per account");

  const fees = await setting<Record<string, Record<string, number>>>(env, "fees", {});
  const f = fees[group] ?? {};
  const feeTotal = Object.values(f).reduce((s, v) => s + (Number(v) || 0), 0);
  const session = await setting(env, "session", "");
  const allowed = ["studentName", "dob", "aadhaar", "category", "religion", "nationality", "bloodGroup", "medium", "fatherName", "motherName",
    "guardianOccupation", "annualIncome", "phone", "altPhone", "email", "address", "city", "pincode", "prevSchool", "prevBoard", "prevClass",
    "prevPercent", "hostel", "applyClass", "stream"];
  const data: Record<string, string> = {};
  for (const k of allowed) if (d[k] != null && d[k] !== "") data[k] = str(d[k], 400);
  data.stream = stream; data.phone = phone;

  let regId = "";
  for (let i = 0; i < 5 && !regId; i++) {
    const cand = "MSI" + String(new Date().getFullYear()).slice(-2) + "-" + rand(6);
    if (!(await env.DB.prepare("SELECT 1 FROM applications WHERE reg_id = ?").bind(cand).first())) regId = cand;
  }
  const ts = now();
  await env.DB.prepare(`INSERT INTO applications (reg_id, uid, session, fee_total, fee_breakup, student_name, father_name, phone, email,
      apply_class, stream, data, files, history, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?15)`)
    .bind(regId, u.uid, session, feeTotal, JSON.stringify(f), data.studentName, data.fatherName, phone, str(d.email || u.email, 120).toLowerCase(),
      cls, stream || null, JSON.stringify(data), JSON.stringify(files),
      JSON.stringify([{ at: ts, status: "submitted", note: "Application received online" }]), ts).run();
  return publicApp(await getApp(env, regId));
}

/* -------------------------------------------------------------- PayU -- */
async function payuInit(env: Env, base: string, u: User, p: any) {
  const pay = await setting<any>(env, "payment", {});
  const key = await secret(env, "payu_key"), salt = await secret(env, "payu_salt");
  if (!pay.payuEnabled || !key || !salt) bad("Online payment is not enabled yet — please pay at the college office");
  const a = await getApp(env, str(p.regId, 20));
  if (!a || a.uid !== u.uid) bad("Application not found", 404);
  if (a!.payment_status === "paid") bad("Fee already paid");
  if (!(a!.fee_total > 0)) bad("No fee is due");
  let returnUrl = str(p.returnUrl, 500);
  try { if (!/^https?:$/.test(new URL(returnUrl).protocol)) returnUrl = ""; } catch { returnUrl = ""; }

  const txnid = "MSI" + Date.now().toString(36).toUpperCase() + rand(4);
  const amount = Number(a!.fee_total).toFixed(2);
  const productinfo = "Registration fee " + a!.reg_id;
  const firstname = (a!.father_name || a!.student_name || "Parent").replace(/[^A-Za-z .]/g, "").slice(0, 60) || "Parent";
  const email = a!.email || u.email, phone = a!.phone, udf1 = a!.reg_id;
  const hash = await sha("SHA-512", [key, txnid, amount, productinfo, firstname, email, udf1, "", "", "", "", "", "", "", "", "", salt].join("|"));
  await env.DB.prepare("INSERT INTO payments (txnid, reg_id, amount, mode, return_url, created_by) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(txnid, a!.reg_id, Number(amount), pay.payuMode || "test", returnUrl, u.uid).run();
  await addHistory(env, a!.reg_id, { status: a!.status, note: "Online payment started (" + txnid + ")" }, { payment_status: "pending" });
  return {
    action: pay.payuMode === "live" ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment",
    fields: { key, txnid, amount, productinfo, firstname, email, phone, udf1, hash, surl: base + "/payu", furl: base + "/payu" },
  };
}

async function payuCallback(env: Env, req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return new Response("Bad request", { status: 400 });
  const f: Record<string, string> = {};
  form.forEach((v, k) => { f[k] = String(v); });
  const pay = await env.DB.prepare("SELECT * FROM payments WHERE txnid = ?").bind(f.txnid || "").first<any>();
  if (!pay) return new Response("Unknown transaction", { status: 404 });
  const back = (status: string) => {
    if (!pay.return_url) return new Response(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Payment ${status}</h2><p>Registration ID: ${pay.reg_id}</p></body>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    return Response.redirect(pay.return_url + "#payresult=" + encodeURIComponent(status) + "&reg=" + encodeURIComponent(pay.reg_id), 303);
  };
  if (pay.status === "success") return back("success");

  const key = await secret(env, "payu_key"), salt = await secret(env, "payu_salt");
  let seq = [salt, f.status, "", "", "", "", "", f.udf5 || "", f.udf4 || "", f.udf3 || "", f.udf2 || "", f.udf1 || "",
    f.email, f.firstname, f.productinfo, f.amount, f.txnid, f.key].join("|");
  if (f.additionalCharges) seq = f.additionalCharges + "|" + seq;
  const hashOk = f.key === key && safeEq(await sha("SHA-512", seq), String(f.hash || "").toLowerCase());

  let verified = false, verifyRaw: unknown = null;
  if (hashOk && f.status === "success") {
    const url = pay.mode === "live" ? "https://info.payu.in/merchant/postservice.php?form=2" : "https://test.payu.in/merchant/postservice.php?form=2";
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key, command: "verify_payment", var1: f.txnid, hash: await sha("SHA-512", [key, "verify_payment", f.txnid, salt].join("|")) }) });
      verifyRaw = await r.json();
      const t = (verifyRaw as any)?.transaction_details?.[f.txnid];
      verified = t?.status === "success" && Math.abs(Number(t.amt ?? t.amount) - Number(pay.amount)) < 0.01;
    } catch (e) { console.error("verify_payment failed", e); }
  }
  const amountOk = Math.abs(Number(f.amount) - Number(pay.amount)) < 0.01;
  const result = hashOk && verified && amountOk ? "success" : hashOk && f.status === "success" ? "pending" : "failure";
  const ts = now();
  await env.DB.prepare("UPDATE payments SET status = ?, gateway_ref = ?, raw = ?, updated_at = ? WHERE txnid = ?")
    .bind(result, f.mihpayid || null, JSON.stringify({ callback: f, verify: verifyRaw, hashOk }), ts, f.txnid).run();
  const a = await getApp(env, pay.reg_id);
  const note = result === "success" ? `Fee ₹${pay.amount} paid online via PayU (${f.mihpayid || f.txnid})`
    : result === "pending" ? `PayU payment ${f.txnid} awaiting confirmation` : `PayU payment ${f.txnid} failed${f.error_Message ? ": " + f.error_Message : ""}`;
  const fields: Record<string, unknown> = result === "success"
    ? { payment_status: "paid", payment_method: "PayU (" + (f.mode || "online") + ")", payment_ref: f.mihpayid || f.txnid, paid_at: ts }
    : { payment_status: result === "failure" ? "failed" : "pending" };
  await addHistory(env, pay.reg_id, { status: a?.status, note }, fields);
  return back(result);
}

/* ------------------------------------------------------------- admin -- */
const CRUD: Record<string, string[]> = {
  notices: ["title", "body", "category", "link_url", "file_url", "is_new", "active", "published_on"],
  gallery: ["url", "caption", "category", "sort"],
  toppers: ["name", "exam", "stream", "percent", "rank_text", "year", "photo_url", "sort"],
  leaders: ["name", "role", "message", "photo_url", "sort"],
};
const BOOL_COLS = new Set(["is_new", "active"]);
const PUBLIC_SETTINGS = ["session", "admissions_open", "contact", "ticker", "fees", "stats", "maps", "payment", "google", "about"];
const fixBools = (r: any) => { for (const k of BOOL_COLS) if (k in r) r[k] = !!r[k]; return r; };
const all = async (env: Env, sql: string, ...b: unknown[]) => ((await env.DB.prepare(sql).bind(...b).all()).results || []) as any[];

async function handle(env: Env, req: Request, base: string) {
  const p: any = await req.json().catch(() => ({}));
  switch (String(p.action || "")) {
    /* ---------- public ---------- */
    case "public.site": {
      const [st, notices, gallery, toppers, leaders] = await env.DB.batch([
        env.DB.prepare("SELECT key, value FROM settings WHERE is_public = 1"),
        env.DB.prepare("SELECT id, title, body, category, link_url, file_url, is_new, published_on FROM notices WHERE active = 1 ORDER BY published_on DESC LIMIT 30"),
        env.DB.prepare("SELECT id, url, caption, category FROM gallery ORDER BY sort LIMIT 200"),
        env.DB.prepare("SELECT id, name, exam, stream, percent, rank_text, year, photo_url FROM toppers ORDER BY sort LIMIT 40"),
        env.DB.prepare("SELECT id, name, role, message, photo_url FROM leaders ORDER BY sort LIMIT 12"),
      ]);
      const settings: Record<string, unknown> = {};
      for (const r of st.results as any[]) settings[r.key] = parse(r.value, null);
      return { settings, notices: (notices.results as any[]).map(fixBools), gallery: gallery.results, toppers: toppers.results, leaders: leaders.results };
    }
    case "public.enquiry": {
      const name = str(p.name, 80), phone = normPhone(p.phone), message = str(p.message, 1000);
      if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone) || message.length < 3) bad("Please fill name, a valid mobile and message");
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM enquiries WHERE phone = ? AND created_at > ?").bind(phone, new Date(Date.now() - 3600_000).toISOString()).first<{ n: number }>();
      if ((n?.n ?? 0) >= 3) bad("Too many messages — please call the office");
      await env.DB.prepare("INSERT INTO enquiries (name, phone, subject, message) VALUES (?, ?, ?, ?)").bind(name, phone, str(p.subject, 60), message).run();
      return { ok: true };
    }
    case "public.track": {
      const a = row(await env.DB.prepare("SELECT * FROM applications WHERE reg_id = ? AND phone = ?").bind(str(p.regId, 20).toUpperCase(), normPhone(p.phone)).first());
      if (!a) return { application: null };
      const out: any = publicApp(a); delete out.data; delete out.email;
      return { application: out };
    }

    /* ---------- signed-in parent ---------- */
    case "me": {
      const u = await requireUser(env, req);
      await touchProfile(env, u);
      const s = await env.DB.prepare("SELECT role FROM staff WHERE email = ?").bind(u.email).first<{ role: string }>();
      return { user: u, staffRole: s?.role ?? null };
    }
    case "apps.uploadTickets": {
      const u = await requireUser(env, req);
      const folder = "apps/" + uidPath(u.uid) + "/" + Date.now().toString(36) + rand(4).toLowerCase();
      const out: Record<string, unknown> = {};
      for (const k of (Array.isArray(p.kinds) ? p.kinds : []).filter((k: string) => FILE_KINDS.includes(k))) {
        out[k] = await ticket(env, base, "docs", folder + "/" + k, k === "photo" ? 1048576 : 3 * 1048576);
      }
      return { tickets: out };
    }
    case "apps.submit": {
      const u = await requireUser(env, req);
      await touchProfile(env, u);
      return { application: await submitApplication(env, u, p) };
    }
    case "apps.mine": {
      const u = await requireUser(env, req);
      const rows = (await all(env, "SELECT * FROM applications WHERE uid = ? ORDER BY created_at DESC", u.uid)).map(row);
      return { applications: await Promise.all(rows.map(async (a: any) => ({ ...publicApp(a), photoUrl: a.files.photo ? await docLink(env, base, a.files.photo) : null }))) };
    }
    case "pay.init": return payuInit(env, base, await requireUser(env, req), p);
    case "pay.office": {
      const u = await requireUser(env, req);
      const a = await getApp(env, str(p.regId, 20));
      if (!a || a.uid !== u.uid) bad("Application not found", 404);
      if (a!.payment_status === "paid") bad("Fee already paid");
      await addHistory(env, a!.reg_id, { status: a!.status, note: "Parent chose to pay at the college office" }, { payment_status: "office", payment_method: "At office" });
      return { ok: true };
    }

    /* ---------- staff ---------- */
    case "admin.bootstrap": {
      const u = await requireUser(env, req);
      const stored = await secret(env, "admin_setup_code_sha256");
      if (!stored) bad("Setup code already used");
      if (!safeEq(await sha("SHA-256", str(p.code, 100).toUpperCase()), stored)) bad("Invalid setup code", 403);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO staff (email, name, role) VALUES (?1, ?2, 'admin') ON CONFLICT(email) DO UPDATE SET role = 'admin', name = ?2").bind(u.email, u.name),
        env.DB.prepare("DELETE FROM app_secrets WHERE key = 'admin_setup_code_sha256'"),
      ]);
      return { ok: true };
    }
    case "admin.stats": {
      await requireStaff(env, req);
      const [apps, enq, users] = await env.DB.batch([
        env.DB.prepare("SELECT status, payment_status, fee_total, apply_class, created_at FROM applications"),
        env.DB.prepare("SELECT COUNT(*) AS n FROM enquiries WHERE status = 'new'"),
        env.DB.prepare("SELECT COUNT(*) AS n FROM profiles"),
      ]);
      return { apps: apps.results, newEnquiries: (enq.results[0] as any).n, users: (users.results[0] as any).n };
    }
    case "admin.apps.list": {
      await requireStaff(env, req);
      return { applications: await all(env, `SELECT reg_id, session, status, payment_status, fee_total, student_name, father_name, phone, email,
        apply_class, stream, payment_method, payment_ref, paid_at, created_at FROM applications ORDER BY created_at DESC LIMIT 5000`) };
    }
    case "admin.apps.get": {
      await requireStaff(env, req);
      const a = await getApp(env, str(p.regId, 20));
      if (!a) bad("Not found", 404);
      const fileUrls: Record<string, string> = {};
      for (const [k, key] of Object.entries(a!.files as Record<string, string>)) fileUrls[k] = await docLink(env, base, key);
      const payments = await all(env, "SELECT txnid, amount, status, gateway, gateway_ref, mode, created_at FROM payments WHERE reg_id = ? ORDER BY created_at DESC", a!.reg_id);
      return { application: { ...a, fileUrls }, payments };
    }
    case "admin.apps.update": {
      const s = await requireStaff(env, req);
      const status = str(p.status, 20);
      if (!["submitted", "review", "approved", "rejected"].includes(status)) bad("Invalid status");
      await addHistory(env, str(p.regId, 20), { status, note: str(p.note, 500), by: s.email }, { status });
      return { ok: true };
    }
    case "admin.apps.cash": {
      const s = await requireStaff(env, req);
      const regId = str(p.regId, 20), receipt = str(p.receiptNo, 40);
      if (!receipt) bad("Enter the office receipt number");
      const a = await getApp(env, regId);
      if (!a) bad("Not found", 404);
      if (a!.payment_status === "paid") bad("Already paid");
      await env.DB.prepare("INSERT INTO payments (txnid, reg_id, amount, gateway, status, gateway_ref, created_by) VALUES (?, ?, ?, 'office', 'cash', ?, ?)")
        .bind("CASH-" + receipt + "-" + rand(3), regId, a!.fee_total, receipt, s.email).run();
      await addHistory(env, regId, { status: a!.status, note: "Fee ₹" + a!.fee_total + " received at office, receipt " + receipt, by: s.email },
        { payment_status: "paid", payment_method: "Cash at office", payment_ref: receipt, paid_at: now() });
      return { ok: true };
    }
    case "admin.apps.delete": {
      await requireStaff(env, req, true);
      const a = await getApp(env, str(p.regId, 20));
      if (a) {
        const keys = Object.values(a.files as Record<string, string>);
        if (keys.length) await env.DOCS.delete(keys);
        await env.DB.batch([
          env.DB.prepare("DELETE FROM payments WHERE reg_id = ?").bind(a.reg_id),
          env.DB.prepare("DELETE FROM applications WHERE reg_id = ?").bind(a.reg_id),
        ]);
      }
      return { ok: true };
    }
    case "admin.payments.list": {
      await requireStaff(env, req);
      return { payments: await all(env, "SELECT txnid, reg_id, amount, gateway, status, gateway_ref, mode, created_at FROM payments ORDER BY created_at DESC LIMIT 2000") };
    }
    case "admin.crud.list": {
      await requireStaff(env, req);
      const t = str(p.table, 20); if (!CRUD[t]) bad("Unknown table");
      const rows = await all(env, `SELECT * FROM ${t} ORDER BY ${t === "notices" ? "published_on DESC" : "sort ASC"} LIMIT 500`);
      return { rows: rows.map(fixBools) };
    }
    case "admin.crud.save": {
      await requireStaff(env, req);
      const t = str(p.table, 20); if (!CRUD[t]) bad("Unknown table");
      const r: Record<string, unknown> = {};
      for (const k of CRUD[t]) if (k in (p.row ?? {})) {
        let v = p.row[k];
        if (v === "" || v === undefined) v = null;
        if (BOOL_COLS.has(k)) v = v ? 1 : 0;
        r[k] = typeof v === "string" ? v.slice(0, 4000) : v;
      }
      const keys = Object.keys(r);
      if (!keys.length) bad("Nothing to save");
      if (p.row?.id) {
        await env.DB.prepare(`UPDATE ${t} SET ${keys.map((k, i) => `${k} = ?${i + 1}`).join(", ")} WHERE id = ?${keys.length + 1}`).bind(...Object.values(r), str(p.row.id, 60)).run();
      } else {
        await env.DB.prepare(`INSERT INTO ${t} (${keys.join(", ")}) VALUES (${keys.map((_, i) => `?${i + 1}`).join(", ")})`).bind(...Object.values(r)).run();
      }
      return { ok: true };
    }
    case "admin.crud.delete": {
      await requireStaff(env, req);
      const t = str(p.table, 20); if (!CRUD[t]) bad("Unknown table");
      await env.DB.prepare(`DELETE FROM ${t} WHERE id = ?`).bind(str(p.id, 60)).run();
      return { ok: true };
    }
    case "admin.uploadTicket": {
      await requireStaff(env, req);
      const folder = ["gallery", "notices", "toppers", "leaders"].includes(p.folder) ? p.folder : "misc";
      return await ticket(env, base, "media", folder + "/" + Date.now().toString(36) + "-" + rand(5).toLowerCase(), 10 * 1048576);
    }
    case "admin.storage": {
      await requireStaff(env, req);
      let docs = 0, media = 0, count = 0;
      for (const [b, add] of [[env.DOCS, (n: number) => (docs += n)], [env.MEDIA, (n: number) => (media += n)]] as const) {
        let cursor: string | undefined;
        do {
          const l = await b.list({ cursor, limit: 1000 });
          for (const o of l.objects) { add(o.size); count++; }
          cursor = l.truncated ? l.cursor : undefined;
        } while (cursor);
      }
      return { docs, media, count, limit: 10 * 1024 ** 3 };
    }
    case "admin.enquiries.list": {
      await requireStaff(env, req);
      return { rows: await all(env, "SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 2000") };
    }
    case "admin.enquiries.update": {
      await requireStaff(env, req);
      await env.DB.prepare("UPDATE enquiries SET status = ? WHERE id = ?").bind(p.status === "resolved" ? "resolved" : "new", str(p.id, 60)).run();
      return { ok: true };
    }
    case "admin.users.list": {
      await requireStaff(env, req);
      return { rows: await all(env, "SELECT uid, email, name, photo_url, created_at, last_login FROM profiles ORDER BY created_at DESC LIMIT 5000") };
    }
    case "admin.settings.get": {
      await requireStaff(env, req);
      const out: Record<string, unknown> = {};
      for (const r of await all(env, "SELECT key, value FROM settings")) out[r.key] = parse(r.value, null);
      out.payuKeySet = !!(await secret(env, "payu_key"));
      out.payuSaltSet = !!(await secret(env, "payu_salt"));
      return { settings: out };
    }
    case "admin.settings.save": {
      await requireStaff(env, req, true);
      const allowed = ["session", "admissions_open", "contact", "ticker", "fees", "stats", "maps", "payment", "about"];
      const stmts = Object.entries(p.settings ?? {}).filter(([k]) => allowed.includes(k)).map(([k, v]) =>
        env.DB.prepare("INSERT INTO settings (key, value, is_public, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(key) DO UPDATE SET value = ?2, is_public = ?3, updated_at = ?4")
          .bind(k, JSON.stringify(v), PUBLIC_SETTINGS.includes(k) ? 1 : 0, now()));
      for (const [k, v] of [["payu_key", p.payuKey], ["payu_salt", p.payuSalt]]) {
        if (v) stmts.push(env.DB.prepare("INSERT INTO app_secrets (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3").bind(k, str(v, 200), now()));
      }
      if (stmts.length) await env.DB.batch(stmts);
      return { ok: true };
    }
    case "admin.staff.list": {
      await requireStaff(env, req);
      return { rows: await all(env, "SELECT * FROM staff ORDER BY created_at") };
    }
    case "admin.staff.save": {
      await requireStaff(env, req, true);
      const email = str(p.email, 120).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bad("Invalid email");
      await env.DB.prepare("INSERT INTO staff (email, name, role) VALUES (?1, ?2, ?3) ON CONFLICT(email) DO UPDATE SET name = ?2, role = ?3")
        .bind(email, str(p.name, 80), p.role === "admin" ? "admin" : "staff").run();
      return { ok: true };
    }
    case "admin.staff.delete": {
      const s = await requireStaff(env, req, true);
      const email = str(p.email, 120).toLowerCase();
      if (email === s.email) bad("You cannot remove yourself");
      await env.DB.prepare("DELETE FROM staff WHERE email = ?").bind(email).run();
      return { ok: true };
    }
    default: return bad("Unknown action", 404);
  }
}

/* ------------------------------------------------------------- router -- */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const base = url.origin;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    try {
      if (url.pathname === "/api" && req.method === "POST") return json({ ok: true, ...(await handle(env, req, base)) });
      if (url.pathname === "/payu" && req.method === "POST") return await payuCallback(env, req);
      if (url.pathname === "/upload" && req.method === "PUT") return json({ ok: true, ...(await handleUpload(env, req, url)) });
      if (url.pathname.startsWith("/media/") && req.method === "GET") return serveObject(env.MEDIA, decodeURIComponent(url.pathname.slice(7)), true);
      if (url.pathname.startsWith("/doc/") && req.method === "GET") {
        const key = decodeURIComponent(url.pathname.slice(5)), exp = Number(url.searchParams.get("exp") || 0);
        if (!exp || exp < Date.now() || !safeEq(await sign(env, "doc:" + key + ":" + exp), url.searchParams.get("sig") || "")) return new Response("Link expired", { status: 403, headers: CORS });
        return serveObject(env.DOCS, key, false);
      }
      if (url.pathname === "/" || url.pathname === "/health") return json({ ok: true, service: "msi-api" });
      return json({ ok: false, error: "Not found" }, 404);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, status);
    }
  },
};
