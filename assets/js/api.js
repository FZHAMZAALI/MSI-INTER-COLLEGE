/* ==========================================================================
   API client + Sign in with Google (Google Identity Services)
   window.MSI.api(action, payload)  → calls the Supabase `api` function
   window.MSI.auth                   → Google Sign-in button + One Tap
   window.MSI.site()                 → public site data (settings, notices…)
   ========================================================================== */
(function () {
  "use strict";
  const CFG = window.MSI_CONFIG || {};
  const STORE_KEY = "msi.gid.v1";
  const listeners = new Set();
  let currentUser = null, authReady = false, clientId = "", gisLoaded = null, sitePromise = null;

  /* ---------- API ---------- */
  async function api(action, payload, opts) {
    const headers = { "Content-Type": "application/json", apikey: CFG.SUPABASE_PUBLISHABLE_KEY };
    if (!(opts && opts.anonymous) && currentUser) headers["x-id-token"] = currentUser.token;
    let res;
    try {
      res = await fetch(CFG.API_URL, { method: "POST", headers, body: JSON.stringify(Object.assign({ action }, payload || {})) });
    } catch (_) {
      throw new Error("Network error — please check your internet and retry.");
    }
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (res.status === 401 && currentUser) { setUser(null); }     // token expired → ask to sign in again
    if (!data || !data.ok) throw new Error((data && data.error) || "Server error (" + res.status + ")");
    return data;
  }
  function site(force) {
    if (!sitePromise || force) sitePromise = api("public.site", {}, { anonymous: true });
    return sitePromise;
  }

  /* ---------- Session (Google ID token, valid ~1 hour) ---------- */
  function decode(jwt) {
    try {
      const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(atob(b).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
    } catch (_) { return null; }
  }
  function userFromToken(token) {
    const p = decode(token);
    if (!p || !p.sub || !p.exp || p.exp * 1000 < Date.now() + 60000) return null;
    return { uid: "g:" + p.sub, email: p.email, displayName: p.name || p.email, photoURL: p.picture || "", token, exp: p.exp * 1000 };
  }
  function setUser(u) {
    currentUser = u;
    try { u ? localStorage.setItem(STORE_KEY, u.token) : localStorage.removeItem(STORE_KEY); } catch (_) {}
    emit();
  }
  function emit() { listeners.forEach(fn => { try { fn(currentUser); } catch (e) { console.error(e); } }); }
  // Expire the session client-side when the token does
  setInterval(() => { if (currentUser && currentUser.exp < Date.now() + 30000) { setUser(null); oneTap(); } }, 30000);

  /* ---------- Google Identity Services ---------- */
  function loadGis() {
    if (gisLoaded) return gisLoaded;
    gisLoaded = new Promise((res, rej) => {
      if (window.google && google.accounts && google.accounts.id) return res();
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true;
      s.onload = res; s.onerror = () => rej(new Error("Could not load Google Sign-in. Check your internet."));
      document.head.appendChild(s);
    });
    return gisLoaded;
  }

  const initPromise = (async () => {
    try { const t = localStorage.getItem(STORE_KEY); if (t) currentUser = userFromToken(t); } catch (_) {}
    try {
      const s = await site();
      clientId = (s.settings && s.settings.google && s.settings.google.clientId) || CFG.GOOGLE_CLIENT_ID || "";
    } catch (_) { clientId = CFG.GOOGLE_CLIENT_ID || ""; }
    if (!clientId) { authReady = true; emit(); return false; }
    await loadGis();
    google.accounts.id.initialize({
      client_id: clientId,
      callback: resp => { const u = userFromToken(resp.credential); if (u) setUser(u); },
      auto_select: true,                // returning users are signed in silently
      cancel_on_tap_outside: true,
      itp_support: true,
      use_fedcm_for_prompt: true,
      context: "signin"
    });
    authReady = true; emit();
    if (!currentUser && auth.oneTapEnabled) oneTap();
    return true;
  })().catch(err => { console.error(err); authReady = true; emit(); return false; });

  function oneTap() { if (window.google && google.accounts && clientId) google.accounts.id.prompt(); }

  const auth = {
    oneTapEnabled: true,
    ready: () => initPromise,
    get user() { return currentUser; },
    get isReady() { return authReady; },
    get configured() { return !!clientId; },
    onChange(fn) { listeners.add(fn); if (authReady) fn(currentUser); return () => listeners.delete(fn); },
    /* Renders Google's official personalised button ("Sign in as …") */
    async renderButton(el, opts) {
      const ok = await initPromise;
      if (!ok || !el) return false;
      el.innerHTML = "";
      google.accounts.id.renderButton(el, Object.assign({
        type: "standard", theme: "outline", size: "large", shape: "pill", text: "signin_with",
        logo_alignment: "left", width: Math.min(360, el.clientWidth || 320)
      }, opts || {}));
      return true;
    },
    async signIn() {
      const ok = await initPromise;
      if (!ok) throw new Error("Google Sign-in is not configured yet.");
      oneTap();
    },
    async signOut() {
      if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
      setUser(null);
    }
  };

  window.MSI = { api, site, auth, config: CFG };
})();
