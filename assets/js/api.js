/* ==========================================================================
   API client + Firebase Google Sign-in
   window.MSI.api(action, payload)  → calls the Supabase `api` function
   window.MSI.auth                   → Google Sign-in (Firebase Auth)
   window.MSI.site()                 → public site data (settings, notices…)
   ========================================================================== */
(function () {
  "use strict";
  const CFG = window.MSI_CONFIG || {};
  const FB_VERSION = "10.14.1";
  let fbAuth = null, fbMods = null, currentUser = null, authReady = false;
  const listeners = new Set();
  let sitePromise = null;

  async function api(action, payload, opts) {
    const headers = { "Content-Type": "application/json", apikey: CFG.SUPABASE_PUBLISHABLE_KEY };
    if (!(opts && opts.anonymous) && currentUser) headers["x-firebase-token"] = await currentUser.getIdToken();
    let res;
    try {
      res = await fetch(CFG.API_URL, { method: "POST", headers, body: JSON.stringify(Object.assign({ action }, payload || {})) });
    } catch (_) {
      throw new Error("Network error — please check your internet and retry.");
    }
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!data || !data.ok) throw new Error((data && data.error) || "Server error (" + res.status + ")");
    return data;
  }

  function site(force) {
    if (!sitePromise || force) sitePromise = api("public.site", {}, { anonymous: true });
    return sitePromise;
  }

  /* ---------- Firebase ---------- */
  async function firebaseConfig() {
    const c = CFG.FIREBASE || {};
    if (c.apiKey && c.projectId) return c;
    try { const s = await site(); return (s.settings && s.settings.firebase) || null; } catch (_) { return null; }
  }

  const initPromise = (async () => {
    const conf = await firebaseConfig();
    if (!conf || !conf.apiKey) { authReady = true; emit(); return false; }
    const [appMod, authMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/" + FB_VERSION + "/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/" + FB_VERSION + "/firebase-auth.js")
    ]);
    fbMods = authMod;
    const app = appMod.initializeApp(conf);
    fbAuth = authMod.getAuth(app);
    fbAuth.languageCode = "hi";
    await new Promise(resolve => {
      authMod.onAuthStateChanged(fbAuth, u => {
        currentUser = u; authReady = true; emit(); resolve();
      });
    });
    return true;
  })().catch(err => { console.error(err); authReady = true; emit(); return false; });

  function emit() { listeners.forEach(fn => { try { fn(currentUser); } catch (e) { console.error(e); } }); }

  const auth = {
    ready: () => initPromise,
    get user() { return currentUser; },
    get isReady() { return authReady; },
    get configured() { return !!fbAuth; },
    onChange(fn) { listeners.add(fn); if (authReady) fn(currentUser); return () => listeners.delete(fn); },
    async signIn() {
      const ok = await initPromise;
      if (!ok) throw new Error("Google Sign-in is not configured yet.");
      const provider = new fbMods.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        await fbMods.signInWithPopup(fbAuth, provider);
      } catch (e) {
        if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) {
          await fbMods.signInWithRedirect(fbAuth, provider);
          return;
        }
        if (e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request")) throw new Error("Sign-in cancelled");
        if (e && e.code === "auth/unauthorized-domain") throw new Error("This website's domain is not authorised in Firebase (Authentication → Settings → Authorized domains).");
        throw new Error((e && e.message) || "Sign-in failed");
      }
    },
    async signOut() { if (fbAuth) await fbMods.signOut(fbAuth); }
  };

  window.MSI = { api, site, auth, config: CFG };
})();
