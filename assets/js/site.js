/* ==========================================================================
   Homepage: renders live content from the database (managed in Admin Panel)
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => /^(https?:\/\/|images\/|assets\/)/i.test(String(u || "")) ? String(u) : "";
  const CAT = { general: ["General", "chip-general"], admission: ["Admission", "chip-admission"], exam: ["Exam", "chip-exam"], result: ["Result", "chip-admission"], holiday: ["Holiday", "chip-general"], event: ["Event", "chip-general"] };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let gallery = [], visible = [], lbIndex = 0, lastFocus = null;

  /* Signed-in parent → avatar in the header links to their dashboard */
  MSI.auth.onChange(u => {
    $$('.header-actions a.icon-btn[href^="register.html"]').forEach(a => {
      if (u) { a.href = "register.html#dashboard"; a.title = u.displayName; a.innerHTML = u.photoURL ? '<img src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;border-radius:50%;object-fit:cover">' : '<i class="fas fa-user-check"></i>'; }
      else { a.href = "register.html#login"; a.title = "Student login"; a.innerHTML = '<i class="fas fa-user"></i>'; }
    });
  });

  MSI.site().then(render).catch(err => {
    console.error(err);
    const nl = $("#noticeList");
    if (nl) nl.innerHTML = '<div class="empty-state"><i class="fas fa-wifi"></i><p>Could not load notices. Please refresh.</p></div>';
  });

  function render(d) {
    const st = d.settings || {};
    // Session, admissions status
    if (st.session) $$("[data-session]").forEach(el => { el.textContent = st.session; });
    if (st.admissions_open === false) {
      $$(".hero-pill").forEach(el => el.hidden = true);
      const t = $("#ctaAdmTitle"); if (t) t.textContent = "Admissions are currently closed.";
    }
    // Stats
    const stats = st.stats || {};
    $$("[data-stat]").forEach(el => { const v = stats[el.dataset.stat]; if (v) el.textContent = v; });
    // Ticker
    const tick = (st.ticker || []).filter(Boolean);
    const ti = $("#tickerItems");
    if (ti) {
      if (!tick.length) ti.closest(".ticker").hidden = true;
      else ti.innerHTML = tick.concat(tick).map(t => "<span>" + esc(t) + "</span>").join("");
    }
    // Contact
    const c = st.contact || {};
    if (c.phone) $$('[data-contact="phone"]').forEach(a => { a.textContent = c.phone; a.href = "tel:" + c.phone.replace(/[^\d+]/g, ""); });
    if (c.hours) $$('[data-contact="hours"]').forEach(el => el.textContent = c.hours);
    if (c.whatsapp) $$('a[href^="https://wa.me/"]').forEach(a => { a.href = "https://wa.me/" + c.whatsapp.replace(/\D/g, ""); });

    renderLeaders(d.leaders || []);
    renderToppers(d.toppers || []);
    renderNotices(d.notices || []);
    renderGallery(d.gallery || []);
    window.observeReveal && window.observeReveal();
  }

  /* ---------- Leaders ---------- */
  function initials(name) {
    const latin = (String(name).match(/\(([^)]+)\)/) || [])[1] || name;
    return latin.replace(/["“”']/g, "").split(/\s+/).filter(w => /^[A-Za-z]/.test(w) && !/^(shri|mr|mrs|dr)\.?$/i.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "★";
  }
  function renderLeaders(rows) {
    const g = $("#leadersGrid"); if (!g) return;
    if (!rows.length) { $("#leadership").hidden = true; return; }
    g.innerHTML = rows.map((l, i) =>
      '<article class="leader reveal' + (i % 2 ? " reveal-delay-1" : "") + '">' +
      (safeUrl(l.photo_url) ? '<img class="leader-photo" src="' + esc(safeUrl(l.photo_url)) + '" alt="' + esc(l.name) + '" loading="lazy">' : '<div class="leader-avatar" aria-hidden="true">' + esc(initials(l.name)) + '</div>') +
      '<div><span class="leader-role">' + esc(l.role) + '</span>' +
      (l.message ? '<blockquote style="margin-top:28px">' + esc(l.message) + '</blockquote>' : "") +
      '<h3 class="leader-name">' + esc(l.name) + '</h3></div></article>').join("");
  }

  /* ---------- Toppers ---------- */
  function renderToppers(rows) {
    const sec = $("#toppers"); if (!sec) return;
    if (!rows.length) { sec.hidden = true; return; }
    sec.hidden = false;
    $("#toppersGrid").innerHTML = rows.map(t =>
      '<article class="topper reveal"><div class="topper-top">' +
      (safeUrl(t.photo_url) ? '<img class="topper-photo" src="' + esc(safeUrl(t.photo_url)) + '" alt="" loading="lazy">' : '<div class="topper-avatar">' + esc(String(t.name).trim().charAt(0)) + '</div>') +
      '<h3>' + esc(t.name) + '</h3><p>' + esc([t.exam, t.stream, t.year].filter(Boolean).join(" · ")) + '</p></div>' +
      (t.percent != null ? '<div class="topper-score">' + esc(Number(t.percent).toFixed(1)) + '%</div>' : "") +
      (t.rank_text ? '<span class="topper-rank">' + esc(t.rank_text) + '</span>' : '<span style="display:block;height:20px"></span>') + '</article>').join("");
  }

  /* ---------- Notices ---------- */
  function renderNotices(rows) {
    const list = $("#noticeList"); if (!list) return;
    if (!rows.length) { list.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notices at the moment.</p></div>'; return; }
    list.innerHTML = rows.map(n => {
      const d = new Date(n.published_on + "T00:00:00");
      const cat = CAT[n.category] || CAT.general;
      const href = safeUrl(n.file_url) || safeUrl(n.link_url);
      return '<article class="notice" data-cat="' + esc(n.category) + '">' +
        '<div class="notice-date"><strong>' + String(d.getDate()).padStart(2, "0") + '</strong><span>' + MONTHS[d.getMonth()] + " " + d.getFullYear() + '</span></div>' +
        '<div><h3>' + esc(n.title) + '</h3>' + (n.body ? '<p class="notice-body">' + esc(n.body) + '</p>' : "") +
        (n.is_new ? '<span class="chip chip-new">NEW</span> ' : "") + '<span class="chip ' + cat[1] + '">' + cat[0] + '</span></div>' +
        (href ? '<a class="btn btn-sm btn-outline dl" href="' + esc(href) + '" target="_blank" rel="noopener">' + (n.file_url ? '<i class="fas fa-file-pdf"></i> View' : 'Open') + '</a>' : "") +
        '</article>';
    }).join("");
  }
  $$("[data-notice-filter]").forEach(btn => btn.addEventListener("click", () => {
    const f = btn.dataset.noticeFilter;
    $$("[data-notice-filter]").forEach(b => { b.classList.toggle("active", b === btn); b.setAttribute("aria-selected", String(b === btn)); });
    $$(".notice").forEach(n => { n.hidden = !(f === "all" || n.dataset.cat === f); });
  }));

  /* ---------- Gallery + lightbox ---------- */
  const grid = $("#gallery-grid");
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
  function renderGallery(rows) {
    gallery = rows.filter(r => safeUrl(r.url));
    if (!grid) return;
    if (!gallery.length) { $("#gallery").hidden = true; return; }
    grid.innerHTML = gallery.map((p, i) =>
      '<button type="button" class="gallery-item" data-cat="' + esc(p.category) + '" data-i="' + i + '">' +
      '<img src="' + esc(safeUrl(p.url)) + '" alt="' + esc(p.caption || "College photo") + '" loading="lazy" decoding="async">' +
      (p.caption ? '<figcaption>' + esc(p.caption) + '</figcaption>' : "") + '</button>').join("");
    refresh();
  }
  const refresh = () => { visible = $$(".gallery-item:not(.is-hidden)", grid).map(b => +b.dataset.i); };
  $$("[data-gallery-filter]").forEach(btn => btn.addEventListener("click", () => {
    const f = btn.dataset.galleryFilter;
    $$("[data-gallery-filter]").forEach(b => b.classList.toggle("active", b === btn));
    $$(".gallery-item", grid).forEach(it => it.classList.toggle("is-hidden", !(f === "all" || it.dataset.cat === f)));
    refresh();
  }));
  grid && grid.addEventListener("click", e => {
    const it = e.target.closest(".gallery-item"); if (!it) return;
    lastFocus = it; openLb(visible.indexOf(+it.dataset.i));
  });
  function showLb() { const p = gallery[visible[lbIndex]]; lbImg.src = safeUrl(p.url); lbImg.alt = p.caption || ""; lbCap.textContent = (p.caption ? p.caption + "  ·  " : "") + (lbIndex + 1) + " / " + visible.length; }
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

  /* ---------- Contact form → database (Admin → Enquiries) ---------- */
  const cf = $("#contactForm");
  cf && cf.addEventListener("submit", async e => {
    e.preventDefault();
    if (!validateFields(cf)) return;
    const btn = cf.querySelector("[type=submit]"), html = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    try {
      await MSI.api("public.enquiry", Object.fromEntries(new FormData(cf)), { anonymous: true });
      toast("Message sent to the college office.");
      cf.reset();
    } catch (err) { toast(err.message, "error"); }
    finally { btn.disabled = false; btn.innerHTML = html; }
  });
})();
