/* ==========================================================================
   Shared site behaviour (home page + portal pages)
   ========================================================================== */
(function () {
  "use strict";
  const CFG = window.MSI_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- Toasts (global) ---------- */
  window.toast = function (msg, type) {
    const stack = $("#toasts");
    if (!stack) return alert(msg);
    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : "");
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = '<i class="fas ' + (type === "error" ? "fa-circle-exclamation" : "fa-circle-check") + '"></i><span></span>';
    el.querySelector("span").textContent = msg;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 4200);
  };

  /* ---------- Session label & year ---------- */
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Header shadow + back-to-top ---------- */
  const header = $("#siteHeader");
  const toTop = $("#toTop");
  const onScroll = () => {
    const sc = header ? header.getBoundingClientRect().top <= 0 && window.scrollY > 40 : false;
    header && header.classList.toggle("is-scrolled", sc);
    toTop && toTop.classList.toggle("show", window.scrollY > 900);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop && toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ---------- Accessibility: text size & contrast (GIGW) ---------- */
  const root = document.documentElement;
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const load = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  let fs = +(load("msi.fs") || 0);
  const applyFs = () => { document.body.style.zoom = ""; root.style.fontSize = (100 + fs * 8) + "%"; document.body.style.fontSize = (16 + fs * 1.5) + "px"; };
  if (fs) applyFs();
  if (load("msi.hc") === "1") root.classList.add("hc");
  $$("[data-fs]").forEach(b => b.addEventListener("click", () => {
    const d = +b.dataset.fs; fs = d === 0 ? 0 : Math.max(-1, Math.min(2, fs + d));
    applyFs(); save("msi.fs", String(fs));
  }));
  $$("[data-hc]").forEach(b => b.addEventListener("click", () => {
    const on = root.classList.toggle("hc"); save("msi.hc", on ? "1" : "0");
  }));

  /* ---------- Mobile drawer ---------- */
  const drawer = $("#mobileDrawer");
  const toggle = $("#menuToggle");
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    toggle && toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { const f = drawer.querySelector(".drawer-nav a"); f && f.focus({ preventScroll: true }); }
    else toggle && toggle.focus({ preventScroll: true });
  }
  toggle && toggle.addEventListener("click", () => setDrawer(true));
  $$("[data-close-drawer]").forEach(el => el.addEventListener("click", () => setDrawer(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && drawer && drawer.classList.contains("open")) setDrawer(false); });

  /* ---------- Reveal on scroll ---------- */
  window.observeReveal = function (root) {
    const els = $$(".reveal:not(.in)", root || document);
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("in")); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    els.forEach(el => io.observe(el));
  };
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add("in"));

  /* ---------- Counters ---------- */
  const counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || "";
        const t0 = performance.now(), dur = 1400;
        const tick = t => {
          const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
          el.textContent = v + suf;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  }

  /* ---------- Active link highlighting (dock + nav) ---------- */
  const sections = $$("main section[id]");
  const dockLinks = $$(".mobile-dock a[href^='#']");
  const navLinks = $$(".primary-nav a[href^='#']");
  if (sections.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const id = "#" + e.target.id;
        dockLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === id));
        navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => io.observe(s));
  }

  /* ---------- Form validation helper (global) ---------- */
  window.validateFields = function (scope) {
    let firstBad = null;
    $$("input, select, textarea", scope).forEach(inp => {
      const field = inp.closest(".field");
      if (!field || inp.disabled || inp.type === "radio" || inp.type === "checkbox") return;
      const ok = inp.checkValidity();
      field.classList.toggle("invalid", !ok);
      if (!ok && !firstBad) firstBad = inp;
    });
    // radio groups
    $$("[data-required-radio]", scope).forEach(group => {
      const ok = !!group.querySelector("input:checked");
      const field = group.closest(".field");
      field && field.classList.toggle("invalid", !ok);
      if (!ok && !firstBad) firstBad = group.querySelector("input");
    });
    if (firstBad) { firstBad.focus({ preventScroll: true }); firstBad.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return !firstBad;
  };
  document.addEventListener("input", e => {
    const f = e.target.closest && e.target.closest(".field.invalid");
    if (f && e.target.checkValidity && e.target.checkValidity()) f.classList.remove("invalid");
  });
  document.addEventListener("change", e => {
    const f = e.target.closest && e.target.closest(".field.invalid");
    if (f && (e.target.type === "radio" || (e.target.checkValidity && e.target.checkValidity()))) f.classList.remove("invalid");
  });
  // Digits only for tel/numeric inputs
  document.addEventListener("input", e => {
    if (e.target.matches && e.target.matches('input[inputmode="numeric"]')) e.target.value = e.target.value.replace(/\D/g, "");
  });

})();
