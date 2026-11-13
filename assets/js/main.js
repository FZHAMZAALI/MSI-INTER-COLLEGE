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
  $$("[data-session]").forEach(el => { el.textContent = CFG.SESSION || el.textContent; });
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

  /* ---------- Notice filter ---------- */
  $$("[data-notice-filter]").forEach(btn => btn.addEventListener("click", () => {
    const f = btn.dataset.noticeFilter;
    $$("[data-notice-filter]").forEach(b => { b.classList.toggle("active", b === btn); b.setAttribute("aria-selected", String(b === btn)); });
    $$(".notice").forEach(n => { n.hidden = !(f === "all" || n.dataset.cat === f); });
  }));
  $$("[data-office-doc]").forEach(b => b.addEventListener("click", () =>
    toast("यह दस्तावेज़ कॉलेज कार्यालय में उपलब्ध है · Please collect it from the college office.")));

  /* ---------- Gallery ---------- */
  const PHOTOS = [
    ["main.jpg", "campus", "Main building & front lawn"],
    ["school_photo_02.jpg", "campus", "Campus & heritage"],
    ["school_photo_09.jpg", "labs", "Smart classrooms"],
    ["school_photo_07.jpg", "sports", "Spacious playground"],
    ["school_photo_11.jpg", "events", "Annual college day"],
    ["school_photo_03.jpg", "campus", "College premises & entrance"],
    ["school_photo_10.jpg", "labs", "Science & computer labs"],
    ["school_photo_13.jpg", "sports", "Co-curricular activities & NCC"],
    ["school_photo_21.jpg", "events", "Annual Seerat-un-Nabi celebration"],
    ["school_photo_04.jpg", "campus", "Academic block"],
    ["school_photo_15.jpg", "labs", "Library & study hall"],
    ["school_photo_14.jpg", "sports", "Sports & athletic field"],
    ["school_photo_12.jpg", "events", "Cultural & academic function"],
    ["school_photo_05.jpg", "campus", "Classrooms & facilities"],
    ["school_photo_16.jpg", "labs", "IT & computer lab"],
    ["school_photo_22.jpg", "events", "Merit & prize distribution"],
    ["school_photo_06.jpg", "campus", "Corridors & infrastructure"],
    ["school_photo_23.jpg", "events", "State-level Qirat competition"],
    ["school_photo_08.jpg", "campus", "Campus grounds & trees"],
    ["school_photo_18.jpg", "events", "Auditorium & hall"],
    ["school_photo_17.jpg", "campus", "Hostel building"],
    ["school_photo_19.jpg", "events", "Staff & teaching faculty"],
    ["school_photo_20.jpg", "events", "Morning assembly"]
  ];
  const grid = $("#gallery-grid");
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
  let visible = [], lbIndex = 0, lastFocus = null;

  if (grid) {
    grid.innerHTML = PHOTOS.map((p, i) =>
      '<button type="button" class="gallery-item" data-cat="' + p[1] + '" data-i="' + i + '">' +
      '<img src="images/' + p[0] + '" alt="' + p[2] + '" loading="lazy" decoding="async">' +
      '<figcaption>' + p[2] + '</figcaption></button>').join("");
    const refresh = () => { visible = $$(".gallery-item:not(.is-hidden)", grid).map(b => +b.dataset.i); };
    refresh();

    $$("[data-gallery-filter]").forEach(btn => btn.addEventListener("click", () => {
      const f = btn.dataset.galleryFilter;
      $$("[data-gallery-filter]").forEach(b => b.classList.toggle("active", b === btn));
      $$(".gallery-item", grid).forEach(it => it.classList.toggle("is-hidden", !(f === "all" || it.dataset.cat === f)));
      refresh();
    }));

    grid.addEventListener("click", e => {
      const it = e.target.closest(".gallery-item"); if (!it) return;
      lastFocus = it; openLb(visible.indexOf(+it.dataset.i));
    });
  }
  function showLb() { const p = PHOTOS[visible[lbIndex]]; lbImg.src = "images/" + p[0]; lbImg.alt = p[2]; lbCap.textContent = p[2] + "  ·  " + (lbIndex + 1) + " / " + visible.length; }
  function openLb(i) { lbIndex = i; showLb(); lb.classList.add("open"); document.body.style.overflow = "hidden"; $(".lb-close", lb).focus(); }
  function closeLb() { lb.classList.remove("open"); document.body.style.overflow = ""; lastFocus && lastFocus.focus(); }
  function step(d) { lbIndex = (lbIndex + d + visible.length) % visible.length; showLb(); }
  if (lb) {
    lb.addEventListener("click", e => {
      const a = e.target.closest("[data-lb]");
      if (a) { a.dataset.lb === "close" ? closeLb() : step(a.dataset.lb === "next" ? 1 : -1); }
      else if (e.target === lb) closeLb();
    });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    });
    let sx = null;
    lb.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); sx = null; });
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

  /* ---------- Contact form → WhatsApp ---------- */
  const cf = $("#contactForm");
  cf && cf.addEventListener("submit", e => {
    e.preventDefault();
    if (!validateFields(cf)) return;
    const d = Object.fromEntries(new FormData(cf));
    const text = "Assalamu Alaikum / Namaste,\n\nName: " + d.name + "\nMobile: " + d.phone + "\nSubject: " + d.subject + "\n\n" + d.message;
    window.open("https://wa.me/" + (CFG.WHATSAPP || "919169252529") + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    toast("WhatsApp खुल रहा है — संदेश भेजें · Opening WhatsApp to send your message.");
    cf.reset();
  });
})();
