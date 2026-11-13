/* ==========================================================================
   Data layer for accounts & admission registrations.
   - Local mode  : localStorage (single browser, demo use)
   - Remote mode : Google Apps Script Web App → Google Sheet (production)
   ========================================================================== */
(function () {
  "use strict";
  const CFG = window.MSI_CONFIG || {};
  const REMOTE = (CFG.APPS_SCRIPT_URL || "").trim();
  const K = { users: "msi.users.v1", apps: "msi.apps.v1", session: "msi.session.v1" };

  /* ---------- storage helpers (never throw) ---------- */
  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }

  /* ---------- hashing ---------- */
  async function sha256(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback (non-secure contexts): FNV-1a — weaker, but keeps the demo usable.
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return "fnv" + (h >>> 0).toString(16);
  }
  function randomId(len) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const arr = new Uint32Array(len);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(arr) : arr.forEach((_, i) => arr[i] = Math.random() * 1e9);
    return Array.from(arr, n => chars[n % chars.length]).join("");
  }
  function normEmail(e) { return String(e || "").trim().toLowerCase(); }
  function normPhone(p) { return String(p || "").replace(/\D/g, "").slice(-10); }

  /* ---------- remote ---------- */
  async function remote(action, payload) {
    // text/plain avoids a CORS preflight, which Apps Script can't answer.
    const res = await fetch(REMOTE, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ action }, payload || {}))
    });
    if (!res.ok) throw new Error("Server error (" + res.status + ")");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  /* ---------- accounts (always local; applications sync remotely) ---------- */
  async function signUp({ name, email, phone, password }) {
    const users = read(K.users, []);
    email = normEmail(email); phone = normPhone(phone);
    if (users.some(u => u.email === email)) throw new Error("इस ईमेल से पहले ही खाता बना है | An account with this email already exists.");
    const salt = randomId(12);
    const user = { id: "U" + Date.now().toString(36) + randomId(4), name: name.trim(), email, phone, salt,
                   hash: await sha256(salt + ":" + password), createdAt: new Date().toISOString(), regIds: [] };
    users.push(user);
    if (!write(K.users, users)) throw new Error("Browser storage unavailable — disable private mode and retry.");
    startSession(user.id);
    return publicUser(user);
  }

  async function signIn({ email, password }) {
    const user = read(K.users, []).find(u => u.email === normEmail(email));
    if (!user || user.hash !== await sha256(user.salt + ":" + password)) {
      throw new Error("ईमेल या पासवर्ड गलत है | Incorrect email or password.");
    }
    startSession(user.id);
    return publicUser(user);
  }

  function startSession(userId) { write(K.session, { userId, at: Date.now() }); }
  function signOut() { try { localStorage.removeItem(K.session); } catch (_) {} }
  function currentUser() {
    const s = read(K.session, null);
    if (!s) return null;
    const u = read(K.users, []).find(x => x.id === s.userId);
    return u ? publicUser(u) : null;
  }
  function publicUser(u) { return { id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt, regIds: u.regIds || [] }; }
  function linkRegId(userId, regId) {
    const users = read(K.users, []);
    const u = users.find(x => x.id === userId);
    if (u) { u.regIds = Array.from(new Set([...(u.regIds || []), regId])); write(K.users, users); }
  }

  /* ---------- applications ---------- */
  function makeRegId() {
    const yr = String(new Date().getFullYear()).slice(-2);
    return "MSI" + yr + "-" + randomId(6);
  }

  async function submitApplication(data, userId) {
    const now = new Date().toISOString();
    const app = Object.assign({}, data, {
      regId: makeRegId(),
      session: CFG.SESSION,
      phone: normPhone(data.phone),
      email: normEmail(data.email),
      status: "submitted",
      history: [{ status: "submitted", at: now, note: "Application received online" }],
      createdAt: now, updatedAt: now
    });
    if (REMOTE) {
      const r = await remote("submit", { data: app });
      if (r.regId) app.regId = r.regId;
    }
    // Keep a local copy so the applicant can view it instantly on this device.
    const apps = read(K.apps, []);
    apps.unshift(app);
    write(K.apps, apps);
    if (userId) linkRegId(userId, app.regId);
    return app;
  }

  /* Track by Registration ID + mobile — works across devices in remote mode. */
  async function findApplication(regId, phone) {
    regId = String(regId || "").trim().toUpperCase(); phone = normPhone(phone);
    if (REMOTE) {
      const r = await remote("status", { regId, phone });
      return r.application || null;
    }
    return read(K.apps, []).find(a => a.regId === regId && a.phone === phone) || null;
  }

  async function myApplications(user) {
    if (!user) return [];
    const ids = new Set(user.regIds || []);
    const local = read(K.apps, []).filter(a => ids.has(a.regId));
    if (!REMOTE) return local;
    // Refresh status from server for each linked application.
    const fresh = await Promise.all(local.map(a => findApplication(a.regId, a.phone).catch(() => a)));
    return fresh.map((a, i) => a || local[i]);
  }

  /* ---------- admin ---------- */
  async function adminList(passcode) {
    if (REMOTE) return (await remote("list", { adminKey: passcode })).applications || [];
    return read(K.apps, []);
  }

  async function adminUpdate(passcode, regId, status, note) {
    const at = new Date().toISOString();
    if (REMOTE) await remote("update", { adminKey: passcode, regId, status, note });
    const apps = read(K.apps, []);
    const a = apps.find(x => x.regId === regId);
    if (a) {
      a.status = status; a.updatedAt = at;
      a.history = (a.history || []).concat({ status, at, note: note || "" });
      write(K.apps, apps);
    }
    return a;
  }

  async function adminDelete(passcode, regId) {
    if (REMOTE) await remote("delete", { adminKey: passcode, regId });
    write(K.apps, read(K.apps, []).filter(x => x.regId !== regId));
  }

  async function verifyAdmin(passcode) {
    if (REMOTE) { await remote("list", { adminKey: passcode, limit: 1 }); return true; }
    return passcode === CFG.ADMIN_PASSCODE;
  }

  window.MSIStore = {
    mode: REMOTE ? "remote" : "local",
    signUp, signIn, signOut, currentUser,
    submitApplication, findApplication, myApplications,
    adminList, adminUpdate, adminDelete, verifyAdmin,
    util: { normPhone, normEmail }
  };
})();
