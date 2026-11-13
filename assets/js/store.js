/* ==========================================================================
   Data layer — accounts, applications, uploads and payments.
   - Remote mode : Google Apps Script → Google Sheet + Drive + Razorpay
   - Demo mode   : localStorage in this browser (when APPS_SCRIPT_URL is empty)
   Both modes expose the same async API (window.MSIStore).
   ========================================================================== */
(function () {
  "use strict";
  const CFG = window.MSI_CONFIG || {};
  const REMOTE = (CFG.APPS_SCRIPT_URL || "").trim();
  const K = { users: "msi.users.v1", apps: "msi.apps.v1", session: "msi.session.v2" };

  /* ---------- storage helpers (never throw) ---------- */
  const read = (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (_) { return f; } };
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (_) { return false; }
  }
  const normEmail = e => String(e || "").trim().toLowerCase();
  const normPhone = p => String(p || "").replace(/\D/g, "").slice(-10);

  async function sha256(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return "fnv" + (h >>> 0).toString(16);
  }
  function randomId(len) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const arr = new Uint32Array(len);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
    else for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 1e9);
    return Array.from(arr, n => chars[n % chars.length]).join("");
  }

  /* ---------- fees ---------- */
  const CLASS_GROUP = {
    "Class 6": "middle", "Class 7": "middle", "Class 8": "middle",
    "Class 9": "high", "Class 10": "high", "Class 11": "inter", "Class 12": "inter"
  };
  function feeBreakup(cls) {
    const f = (CFG.FEES || {})[CLASS_GROUP[cls]] || { admission: 0, tuition: 0, lab: 0, library: 0 };
    return Object.assign({}, f, { total: f.admission + f.tuition + f.lab + f.library });
  }

  /* ---------- remote ---------- */
  async function remote(action, payload) {
    let res;
    try {
      res = await fetch(REMOTE, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },   // no CORS preflight
        body: JSON.stringify(Object.assign({ action }, payload || {}))
      });
    } catch (_) { throw new Error("नेटवर्क त्रुटि · Network error — please check your internet and retry."); }
    if (!res.ok) throw new Error("Server error (" + res.status + ")");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  /* ---------- session ---------- */
  const session = () => read(K.session, null);
  function setSession(s) { write(K.session, s); }
  function signOut() { try { localStorage.removeItem(K.session); } catch (_) {} }
  function currentUser() { const s = session(); return s ? s.user : null; }

  /* ---------- accounts ---------- */
  async function signUp({ name, email, phone, password }) {
    if (REMOTE) {
      const r = await remote("signup", { name, email, phone, password });
      setSession({ token: r.token, user: r.user });
      return r.user;
    }
    const users = read(K.users, []);
    email = normEmail(email);
    if (users.some(u => u.email === email)) throw new Error("इस ईमेल से पहले ही खाता बना है | An account with this email already exists.");
    const salt = randomId(12);
    const user = { id: "U" + Date.now().toString(36) + randomId(4), name: name.trim(), email, phone: normPhone(phone), salt,
                   hash: await sha256(salt + ":" + password), createdAt: new Date().toISOString() };
    users.push(user);
    if (!write(K.users, users)) throw new Error("Browser storage unavailable — disable private mode and retry.");
    const pub = { id: user.id, name: user.name, email, phone: user.phone, createdAt: user.createdAt };
    setSession({ token: "local:" + user.id, user: pub });
    return pub;
  }

  async function signIn({ email, password }) {
    if (REMOTE) {
      const r = await remote("login", { email, password });
      setSession({ token: r.token, user: r.user });
      return r.user;
    }
    const u = read(K.users, []).find(x => x.email === normEmail(email));
    if (!u || u.hash !== await sha256(u.salt + ":" + password)) throw new Error("ईमेल या पासवर्ड गलत है | Incorrect email or password.");
    const pub = { id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt };
    setSession({ token: "local:" + u.id, user: pub });
    return pub;
  }

  /* ---------- local application helpers ---------- */
  function saveLocal(app) {
    let apps = read(K.apps, []);
    const i = apps.findIndex(a => a.regId === app.regId);
    if (i >= 0) apps[i] = Object.assign({}, apps[i], app); else apps.unshift(app);
    if (!write(K.apps, apps)) {
      // Out of space: drop document images from older entries, keep photos.
      apps = apps.map((a, idx) => idx === 0 ? a : Object.assign({}, a, { files: a.files ? { photo: a.files.photo } : undefined }));
      if (!write(K.apps, apps)) throw new Error("Browser storage is full. Please connect the online backend.");
    }
    return apps.find(a => a.regId === app.regId);
  }
  const localFind = regId => read(K.apps, []).find(a => a.regId === regId) || null;
  function localPatch(regId, fields, note, histStatus) {
    const a = localFind(regId);
    if (!a) throw new Error("Application not found");
    const at = new Date().toISOString();
    const upd = Object.assign({}, fields, { updatedAt: at });
    if (note || histStatus) upd.history = (a.history || []).concat({ status: histStatus || a.status, at, note: note || "" });
    return saveLocal(Object.assign({}, a, upd));
  }

  /* ---------- applications ---------- */
  async function submitApplication(data, files) {
    const s = session();
    if (REMOTE) {
      const r = await remote("submit", { token: s && s.token, data, files });
      // keep a local copy (with photo) for instant slip printing on this device
      const app = Object.assign({}, r.application, { files: { photo: files && files.photo } });
      try { saveLocal(app); } catch (_) {}
      return app;
    }
    const now = new Date().toISOString();
    const app = Object.assign({}, data, {
      regId: "MSI" + String(new Date().getFullYear()).slice(-2) + "-" + randomId(6),
      userId: s ? s.user.id : "",
      session: CFG.SESSION, phone: normPhone(data.phone), email: normEmail(data.email),
      status: "submitted", paymentStatus: "unpaid", feeTotal: feeBreakup(data.applyClass).total,
      files, history: [{ status: "submitted", at: now, note: "Application received online" }],
      createdAt: now, updatedAt: now
    });
    return saveLocal(app);
  }

  async function findApplication(regId, phone) {
    regId = String(regId || "").trim().toUpperCase(); phone = normPhone(phone);
    if (REMOTE) {
      const r = await remote("status", { regId, phone });
      if (!r.application) return null;
      const local = localFind(regId);
      return Object.assign({}, r.application, local && local.files ? { files: { photo: local.files.photo } } : {});
    }
    const a = localFind(regId);
    return a && a.phone === phone ? a : null;
  }

  async function myApplications() {
    const s = session();
    if (!s) return [];
    if (REMOTE) {
      const r = await remote("myApps", { token: s.token });
      return (r.applications || []).map(a => { const l = localFind(a.regId); return Object.assign({}, a, l && l.files ? { files: { photo: l.files.photo } } : {}); });
    }
    return read(K.apps, []).filter(a => a.userId === s.user.id);
  }

  /* ---------- payments ---------- */
  const PAY = CFG.PAYMENT || {};
  const paymentOptions = () => ({
    razorpay: !!(PAY.RAZORPAY_KEY_ID),
    upi: !!(PAY.UPI_ID),
    office: PAY.ALLOW_PAY_AT_OFFICE !== false,
    demo: !REMOTE && PAY.DEMO_PAYMENT !== false
  });

  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = res; s.onerror = () => rej(new Error("Could not load the payment gateway. Check your internet."));
      document.head.appendChild(s);
    });
  }

  /* Opens Razorpay Checkout. Resolves with the updated application. */
  async function payOnline(app) {
    await loadRazorpay();
    let order = null;
    if (REMOTE) order = await remote("payOrder", { regId: app.regId, phone: app.phone });
    const amount = order ? order.amount : Math.round(app.feeTotal * 100);
    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: order ? order.keyId : PAY.RAZORPAY_KEY_ID,
        amount, currency: "INR",
        order_id: order ? order.orderId : undefined,
        name: "M.S.I. Inter College",
        description: "Admission fee · " + app.regId,
        image: new URL("assets/img/crest.svg", location.href).href,
        prefill: { name: app.fatherName || app.studentName, email: app.email || "", contact: app.phone },
        notes: { regId: app.regId, student: app.studentName },
        theme: { color: "#0f4433" },
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        handler: async (resp) => {
          try {
            if (REMOTE) {
              const r = await remote("payVerify", { regId: app.regId, phone: app.phone, orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
              resolve(Object.assign({}, r.application, { files: app.files }));
            } else {
              resolve(localPatch(app.regId, { paymentStatus: "paid", paymentMethod: "Razorpay", paymentRef: resp.razorpay_payment_id, paymentAt: new Date().toISOString() },
                "Fee ₹" + app.feeTotal + " paid online (" + resp.razorpay_payment_id + ")", "paid"));
            }
          } catch (e) { reject(e); }
        }
      });
      rzp.on("payment.failed", r => reject(new Error((r.error && r.error.description) || "Payment failed")));
      rzp.open();
    });
  }

  async function payUpi(app, utr, screenshot) {
    utr = String(utr || "").replace(/\s/g, "");
    if (REMOTE) {
      const r = await remote("payUpi", { regId: app.regId, phone: app.phone, utr, screenshot });
      return Object.assign({}, r.application, { files: app.files });
    }
    if (read(K.apps, []).some(a => a.paymentRef === utr && a.regId !== app.regId)) throw new Error("This UTR has already been used");
    return localPatch(app.regId, { paymentStatus: "verification", paymentMethod: "UPI", paymentRef: utr, paymentAt: new Date().toISOString(), paymentProof: screenshot || "" },
      "UPI payment submitted, UTR " + utr, "verification");
  }

  async function payAtOffice(app) {
    if (REMOTE) {
      const r = await remote("payOffice", { regId: app.regId, phone: app.phone });
      return Object.assign({}, r.application, { files: app.files });
    }
    return localPatch(app.regId, { paymentStatus: "office", paymentMethod: "At office" }, "Will pay at the college office", "office");
  }

  async function payDemo(app) {
    const ref = "DEMO" + randomId(10);
    return localPatch(app.regId, { paymentStatus: "paid", paymentMethod: "Demo (test)", paymentRef: ref, paymentAt: new Date().toISOString() },
      "Test payment ₹" + app.feeTotal + " (demo mode)", "paid");
  }

  /* ---------- admin ---------- */
  async function verifyAdmin(passcode) {
    if (REMOTE) { await remote("list", { adminKey: passcode, limit: 1 }); return true; }
    return !!passcode && passcode === CFG.ADMIN_PASSCODE;
  }
  async function adminList(passcode) {
    if (REMOTE) return (await remote("list", { adminKey: passcode })).applications || [];
    return read(K.apps, []);
  }
  async function adminUpdate(passcode, regId, status, note) {
    if (REMOTE) return remote("update", { adminKey: passcode, regId, status, note });
    return localPatch(regId, { status }, note || "", status);
  }
  async function adminPayment(passcode, regId, paymentStatus, note) {
    if (REMOTE) return remote("verifyPayment", { adminKey: passcode, regId, paymentStatus, note });
    const f = { paymentStatus };
    if (paymentStatus === "paid") f.paymentAt = new Date().toISOString();
    return localPatch(regId, f, note || "Payment marked " + paymentStatus + " by office", paymentStatus === "paid" ? "paid" : null);
  }
  async function adminResetPassword(passcode, email, password) {
    if (REMOTE) return remote("resetPassword", { adminKey: passcode, email, password });
    const users = read(K.users, []);
    const u = users.find(x => x.email === normEmail(email));
    if (!u) throw new Error("No account with that email");
    u.salt = randomId(12); u.hash = await sha256(u.salt + ":" + password);
    write(K.users, users);
  }
  async function adminDelete(passcode, regId) {
    if (REMOTE) await remote("delete", { adminKey: passcode, regId });
    write(K.apps, read(K.apps, []).filter(x => x.regId !== regId));
  }

  window.MSIStore = {
    mode: REMOTE ? "remote" : "local",
    signUp, signIn, signOut, currentUser,
    submitApplication, findApplication, myApplications,
    paymentOptions, payOnline, payUpi, payAtOffice, payDemo,
    verifyAdmin, adminList, adminUpdate, adminPayment, adminResetPassword, adminDelete,
    feeBreakup, CLASS_GROUP,
    util: { normPhone, normEmail }
  };
})();
