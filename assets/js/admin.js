/* ==========================================================================
   M.S.I. Inter College — Admin Panel
   Sign in with Google → staff check on the server → manage everything.
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = iso => { if (!iso) return ""; const d = new Date(String(iso).length === 10 ? iso + "T00:00:00" : iso); return isNaN(d) ? iso : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
  const fmtT = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };
  const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN");
  const api = (a, p) => MSI.api(a, p);
  const CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
  const STATUS = { submitted: ["New", "status-submitted"], review: ["Under review", "status-review"], approved: ["Approved", "status-approved"], rejected: ["Not approved", "status-rejected"] };
  const PAY = { unpaid: ["Unpaid", "status-rejected"], pending: ["Processing", "status-review"], office: ["At office", "status-submitted"], paid: ["Paid", "status-approved"], failed: ["Failed", "status-rejected"] };
  const PSTAT = { success: ["Success", "status-approved"], cash: ["Cash", "status-approved"], initiated: ["Started", "status-submitted"], pending: ["Pending", "status-review"], failure: ["Failed", "status-rejected"] };
  const NCAT = { general: "General", admission: "Admission", exam: "Exam", result: "Result", holiday: "Holiday", event: "Event" };
  const badge = (map, k) => { const b = map[k] || [k, "status-submitted"]; return '<span class="status-badge ' + b[1] + '">' + esc(b[0]) + "</span>"; };

  let ME = null, ROLE = null;
  const content = $("#content");

  /* ================================================================ Gate */
  const gateBody = $("#gateBody");
  const GOOGLE_BTN = '<div class="gis-btn" id="gSignIn"></div>';

  function gate(html) { $("#gate").hidden = false; $("#shell").hidden = true; gateBody.innerHTML = html; const b = $("#gSignIn"); if (b) MSI.auth.renderButton(b, { text: "signin_with" }); }
  gateBody.addEventListener("click", async e => {
    if (e.target.closest("#gSignOut")) await MSI.auth.signOut();
  });
  gateBody.addEventListener("submit", async e => {
    if (e.target.id !== "setupForm") return;
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
    try { await api("admin.bootstrap", { code: $("#setupCode").value.trim() }); toast("You are now an administrator."); boot(MSI.auth.user); }
    catch (err) { toast(err.message, "error"); }
    finally { btn.disabled = false; }
  });

  MSI.auth.ready().then(ok => {
    if (!ok) gate('<div class="alert alert-warn" style="text-align:left"><i class="fas fa-triangle-exclamation"></i><div><strong>Google Sign-in is not configured.</strong><br>Add the Google OAuth Client ID in the database setting <code>google</code> (see README).</div></div>');
  });
  MSI.auth.onChange(user => {
    if (!MSI.auth.configured) return;
    if (!user) { ME = null; return gate('<p class="muted" style="margin-bottom:16px">Only authorised staff can sign in.</p>' + GOOGLE_BTN); }
    boot(user);
  });

  async function boot(user) {
    gate('<p class="muted"><i class="fas fa-spinner fa-spin"></i> Checking access…</p>');
    try {
      const r = await api("me");
      if (!r.staffRole) {
        return gate('<div class="alert alert-error" style="text-align:left;margin-bottom:16px"><i class="fas fa-lock"></i><div><strong>' + esc(user.email) + '</strong> is not authorised.<br>Ask an administrator to add you under Staff access.</div></div>' +
          '<form id="setupForm" style="text-align:left"><div class="field"><label for="setupCode">First-time setup code</label><input id="setupCode" required autocomplete="off" placeholder="MSI-XXXXXXXX-XXXXXXXX" style="text-transform:uppercase"></div>' +
          '<button class="btn btn-block" type="submit" style="margin-top:12px"><i class="fas fa-key"></i> Activate as administrator</button></form>' +
          '<button class="btn btn-outline btn-block" id="gSignOut" style="margin-top:10px">Use another account</button>');
      }
      ME = r.user; ROLE = r.staffRole;
      $("#gate").hidden = true; $("#shell").hidden = false;
      $("#userPhoto").src = user.photoURL || "assets/img/crest.svg";
      $("#userName").textContent = user.displayName || user.email;
      $("#userRole").textContent = ROLE;
      $$('[data-page="staff"], [data-page="settings"]').forEach(a => a.hidden = false);
      route();
      refreshCounts();
    } catch (err) { gate('<div class="alert alert-error"><i class="fas fa-circle-xmark"></i><div>' + esc(err.message) + '</div></div>' + GOOGLE_BTN); }
  }
  $("#signOutBtn").addEventListener("click", () => MSI.auth.signOut());

  /* ============================================================== Router */
  const PAGES = {
    dashboard: ["Dashboard", "Overview of admissions and fees", pageDashboard],
    applications: ["Applications", "All online admission applications", pageApplications],
    payments: ["Payments", "Online (PayU) and office fee payments", pagePayments],
    enquiries: ["Enquiries", "Messages from the website contact form", pageEnquiries],
    users: ["Parent accounts", "Google accounts that signed in to the portal", pageUsers],
    notices: ["Notices", "Notice board on the homepage", () => pageCrud("notices")],
    gallery: ["Gallery", "Photos shown on the homepage", pageGallery],
    toppers: ["Toppers", "Board exam toppers on the homepage", () => pageCrud("toppers")],
    leaders: ["Leadership", "Principal, manager and management on the homepage", () => pageCrud("leaders")],
    settings: ["Settings", "Session, fees, contact details and payments", pageSettings],
    staff: ["Staff access", "Who can sign in to this panel", pageStaff]
  };
  function route() {
    if (!ME) return;
    closeDrawer();
    const page = PAGES[location.hash.slice(1)] ? location.hash.slice(1) : "dashboard";
    $$("#admNav a").forEach(a => a.classList.toggle("active", a.dataset.page === page));
    $("#pageTitle").textContent = PAGES[page][0];
    $("#pageSub").textContent = PAGES[page][1];
    $("#shell").classList.remove("nav-open");
    content.innerHTML = '<div class="adm-empty"><i class="fas fa-spinner fa-spin"></i>Loading…</div>';
    Promise.resolve(PAGES[page][2]()).catch(err => { content.innerHTML = '<div class="alert alert-error"><i class="fas fa-circle-xmark"></i><div>' + esc(err.message) + '</div></div>'; });
  }
  window.addEventListener("hashchange", route);
  $("#refreshBtn").addEventListener("click", () => { route(); refreshCounts(); });
  $("#menuBtn").addEventListener("click", () => $("#shell").classList.toggle("nav-open"));
  $("#scrim").addEventListener("click", () => $("#shell").classList.remove("nav-open"));

  async function refreshCounts() {
    try {
      const s = await api("admin.stats");
      const n = s.apps.filter(a => a.status === "submitted").length;
      $("#cntApps").textContent = n || "";
      $("#cntEnq").textContent = s.newEnquiries || "";
    } catch (_) {}
  }

  /* ============================================================== Drawer */
  const drawer = $("#drawer");
  function openDrawer(title, body, foot) {
    $("#drawerTitle").textContent = title;
    $("#drawerBody").innerHTML = body;
    $("#drawerFoot").innerHTML = foot || "";
    drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  drawer.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeDrawer(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer(); });

  function busy(btn, on) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }
    else { btn.innerHTML = btn.dataset.html || btn.innerHTML; btn.disabled = false; }
  }

  /* ---------- file helpers ---------- */
  const readAsDataURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  async function fileToData(file, maxDim) {
    if (file.type === "application/pdf") { if (file.size > 5 * 1024 * 1024) throw new Error("PDF max 5 MB"); return readAsDataURL(file); }
    if (!/^image\//.test(file.type)) throw new Error("Choose an image or PDF");
    const url = await readAsDataURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const sc = Math.min(1, (maxDim || 1600) / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  }
  async function upload(file, folder, maxDim) {
    const data = await fileToData(file, maxDim);
    const t = await api("admin.uploadTicket", { folder });
    return (await MSI.putDataUrl(t.uploadUrl, data)).url;
  }
  function csv(rows, cols, name) {
    const cell = v => { let s = String(v == null ? "" : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const out = [cols.map(c => cell(c[1])).join(",")].concat(rows.map(r => cols.map(c => cell(typeof c[0] === "function" ? c[0](r) : r[c[0]])).join(","))).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + out], { type: "text/csv;charset=utf-8" }));
    a.download = name + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* =========================================================== Dashboard */
  async function pageDashboard() {
    const [s, list, store] = await Promise.all([api("admin.stats"), api("admin.apps.list"), api("admin.storage").catch(() => null)]);
    const apps = s.apps;
    const paid = apps.filter(a => a.payment_status === "paid");
    const collected = paid.reduce((t, a) => t + (a.fee_total || 0), 0);
    const due = apps.filter(a => a.payment_status !== "paid").reduce((t, a) => t + (a.fee_total || 0), 0);
    const byClass = CLASSES.map(c => [c.replace("Class ", "Class "), apps.filter(a => a.apply_class === c).length]);
    const max = Math.max(1, ...byClass.map(b => b[1]));
    const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + i); return d; });
    const perDay = days.map(d => apps.filter(a => { const x = new Date(a.created_at); return x >= d && x < new Date(d.getTime() + 864e5); }).length);
    const dmax = Math.max(1, ...perDay);
    const recent = (list.applications || []).slice(0, 8);

    content.innerHTML =
      '<div class="adm-kpis">' +
      kpi("fa-file-signature", "Applications", apps.length, apps.filter(a => a.status === "submitted").length + " new to review") +
      kpi("fa-indian-rupee-sign", "Fee collected", rupee(collected), paid.length + " paid", "gold") +
      kpi("fa-hourglass-half", "Fee pending", rupee(due), apps.filter(a => a.payment_status !== "paid").length + " applications", "saffron") +
      kpi("fa-envelope-open-text", "New enquiries", s.newEnquiries, s.users + " parent accounts", "blue") +
      '</div>' +
      '<div class="adm-two" style="margin-top:18px">' +
      '<div class="adm-card"><div class="adm-card-head"><h3>Applications — last 14 days</h3></div><div class="adm-card-body"><div class="adm-spark">' +
      perDay.map((n, i) => '<div title="' + n + '"><b style="font-size:11px;color:var(--ink-700)">' + (n || "") + '</b><span style="height:' + Math.round(n / dmax * 100) + '%"></span>' + days[i].getDate() + '</div>').join("") +
      '</div></div></div>' +
      '<div class="adm-card"><div class="adm-card-head"><h3>By class</h3></div><div class="adm-card-body"><div class="adm-bars">' +
      byClass.map(b => '<div class="adm-bar"><span>' + b[0] + '</span><div class="adm-bar-track"><div class="adm-bar-fill" style="width:' + Math.round(b[1] / max * 100) + '%"></div></div><b>' + b[1] + '</b></div>').join("") +
      '</div></div></div></div>' +
      (store ? storageCard(store) : "") +
      '<div class="adm-card" style="margin-top:18px"><div class="adm-card-head"><h3>Recent applications</h3><a class="btn btn-xs btn-outline" href="#applications">View all</a></div>' +
      (recent.length ? appTable(recent) : '<div class="adm-empty"><i class="fas fa-inbox"></i>No applications yet. Share the registration link: <b>' + esc(location.origin + location.pathname.replace("admin.html", "register.html")) + '</b></div>') + '</div>';
    bindAppRows();
  }
  function storageCard(st) {
    const used = st.docs + st.media, pct = Math.min(100, used / st.limit * 100);
    const mb = n => (n / 1048576).toFixed(n < 10485760 ? 2 : 0) + " MB";
    return '<div class="adm-card" style="margin-top:18px"><div class="adm-card-head"><h3><i class="fas fa-hard-drive" style="color:var(--emerald-700)"></i> File storage</h3>' +
      '<span class="adm-note">' + mb(used) + ' of 10 GB free plan · ' + st.count + ' files</span></div><div class="adm-card-body">' +
      '<div class="adm-bar-track" style="height:12px"><div class="adm-bar-fill" style="width:' + Math.max(pct, 0.5).toFixed(2) + '%;' + (pct > 80 ? "background:var(--danger)" : "") + '"></div></div>' +
      '<p class="adm-note" style="margin-top:8px">Applicant documents ' + mb(st.docs) + ' · Website photos ' + mb(st.media) + (pct > 80 ? ' · <b style="color:var(--danger)">Storage is over 80% — archive old session documents.</b>' : "") + '</p></div></div>';
  }
  const kpi = (icon, label, value, sub, cls) => '<div class="adm-kpi ' + (cls || "") + '"><i class="fas ' + icon + '"></i><small>' + label + '</small><strong>' + esc(value) + '</strong><span>' + esc(sub) + '</span></div>';

  /* ======================================================== Applications */
  let APPS = [];
  function appTable(rows) {
    return '<div class="adm-table-wrap"><table class="adm-table responsive"><thead><tr><th>Reg. ID</th><th>Student</th><th>Class</th><th class="hide-xs">Mobile</th><th>Fee</th><th>Status</th><th class="hide-xs">Date</th></tr></thead><tbody>' +
      rows.map(a => '<tr class="click" data-reg="' + esc(a.reg_id) + '"><td class="mono">' + esc(a.reg_id) + '</td>' +
        '<td><strong>' + esc(a.student_name) + '</strong><span class="sub">' + esc(a.father_name || "") + '</span></td>' +
        '<td>' + esc(a.apply_class) + (a.stream ? '<span class="sub">' + esc(a.stream) + '</span>' : "") + '</td>' +
        '<td class="hide-xs">' + esc(a.phone) + '</td>' +
        '<td>' + rupee(a.fee_total) + '<br>' + badge(PAY, a.payment_status) + '</td>' +
        '<td>' + badge(STATUS, a.status) + '</td><td class="hide-xs">' + fmt(a.created_at) + '</td></tr>').join("") +
      '</tbody></table></div>';
  }
  function bindAppRows() { $$("tr[data-reg]", content).forEach(tr => tr.addEventListener("click", () => openApp(tr.dataset.reg))); }

  async function pageApplications() {
    APPS = (await api("admin.apps.list")).applications || [];
    content.innerHTML =
      '<div class="adm-toolbar">' +
      '<div class="adm-search"><i class="fas fa-magnifying-glass"></i><input id="q" type="search" placeholder="Search name, Reg. ID, mobile, father\'s name"></div>' +
      '<select id="fStatus"><option value="">All statuses</option>' + Object.entries(STATUS).map(([k, v]) => '<option value="' + k + '">' + v[0] + '</option>').join("") + '</select>' +
      '<select id="fPay"><option value="">All payments</option>' + Object.entries(PAY).map(([k, v]) => '<option value="' + k + '">' + v[0] + '</option>').join("") + '</select>' +
      '<select id="fClass"><option value="">All classes</option>' + CLASSES.map(c => '<option>' + c + '</option>').join("") + '</select>' +
      '<button class="btn btn-sm btn-outline" id="exportApps"><i class="fas fa-file-csv"></i> Export</button></div>' +
      '<div class="adm-card" id="appList"></div>';
    const draw = () => {
      const q = $("#q").value.trim().toLowerCase(), st = $("#fStatus").value, fp = $("#fPay").value, fc = $("#fClass").value;
      const rows = APPS.filter(a => (!st || a.status === st) && (!fp || a.payment_status === fp) && (!fc || a.apply_class === fc) &&
        (!q || [a.reg_id, a.student_name, a.father_name, a.phone, a.email, a.payment_ref].join(" ").toLowerCase().includes(q)));
      $("#appList").innerHTML = rows.length ? appTable(rows) : '<div class="adm-empty"><i class="fas fa-inbox"></i>No applications match.</div>';
      bindAppRows();
      return rows;
    };
    ["#q", "#fStatus", "#fPay", "#fClass"].forEach(id => $(id).addEventListener("input", draw));
    $("#exportApps").addEventListener("click", () => csv(draw(), [["reg_id", "Reg ID"], ["student_name", "Student"], ["father_name", "Father"], ["phone", "Mobile"], ["email", "Email"], ["apply_class", "Class"], ["stream", "Stream"], ["status", "Status"], ["fee_total", "Fee"], ["payment_status", "Payment"], ["payment_method", "Method"], ["payment_ref", "Ref"], [r => fmt(r.paid_at), "Paid on"], [r => fmt(r.created_at), "Applied on"]], "msi-applications"));
    draw();
  }

  const LABELS = [["studentName", "Student"], ["dob", "Date of birth"], ["category", "Category"], ["religion", "Religion"], ["nationality", "Nationality"], ["bloodGroup", "Blood group"], ["aadhaar", "Aadhaar"],
    ["applyClass", "Class"], ["stream", "Stream"], ["medium", "Medium"], ["fatherName", "Father / Guardian"], ["motherName", "Mother"], ["guardianOccupation", "Occupation"], ["annualIncome", "Annual income"],
    ["phone", "Mobile"], ["altPhone", "Alt. mobile"], ["email", "Email"], ["address", "Address"], ["city", "City"], ["pincode", "PIN"],
    ["prevSchool", "Previous school"], ["prevBoard", "Previous board"], ["prevClass", "Last class"], ["prevPercent", "Percentage"], ["hostel", "Hostel"]];
  const DOCN = { photo: "Photograph", marksheet: "Mark sheet", aadhaarDoc: "Aadhaar", tc: "Transfer certificate", birthCert: "Birth certificate" };

  async function openApp(regId) {
    openDrawer(regId, '<div class="adm-empty"><i class="fas fa-spinner fa-spin"></i>Loading…</div>');
    const r = await api("admin.apps.get", { regId }).catch(err => { toast(err.message, "error"); closeDrawer(); });
    if (!r) return;
    const a = r.application, d = a.data || {}, urls = a.fileUrls || {};
    const body =
      '<div class="adm-head-row">' + (urls.photo ? '<img class="adm-photo-big" src="' + esc(urls.photo) + '" alt="">' : "") +
      '<div style="flex:1;min-width:200px"><h3 style="font-size:1.35rem;color:var(--emerald-900)">' + esc(a.student_name) + '</h3>' +
      '<p class="muted">' + esc(a.apply_class) + (a.stream ? " · " + esc(a.stream) : "") + ' · Session ' + esc(a.session) + '</p>' +
      '<p style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' + badge(STATUS, a.status) + badge(PAY, a.payment_status) + '</p>' +
      '<p style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-xs btn-outline" href="tel:' + esc(a.phone) + '"><i class="fas fa-phone"></i> Call</a>' +
      '<a class="btn btn-xs btn-outline" target="_blank" rel="noopener" href="https://wa.me/91' + esc(a.phone) + '?text=' + encodeURIComponent("M.S.I. Inter College, Gorakhpur — regarding admission registration " + a.reg_id + " (" + a.student_name + "): ") + '"><i class="fab fa-whatsapp"></i> WhatsApp</a></p></div></div>' +
      '<div class="adm-section-title">Documents</div><div class="adm-doc-links">' +
      (Object.keys(urls).length ? Object.entries(urls).map(([k, u]) => '<a href="' + esc(u) + '" target="_blank" rel="noopener"><i class="fas fa-file"></i> ' + esc(DOCN[k] || k) + '</a>').join("") : '<span class="muted">No documents uploaded</span>') + '</div>' +
      '<div class="adm-section-title">Fee</div><div class="fee-box" style="margin:0">' +
      '<div class="fee-row total" style="border:0;margin:0;padding:0"><span>Total ' + rupee(a.fee_total) + '</span><span>' + badge(PAY, a.payment_status) + '</span></div>' +
      (a.payment_method ? '<div class="fee-row"><span>Method</span><span>' + esc(a.payment_method) + '</span></div>' : "") +
      (a.payment_ref ? '<div class="fee-row"><span>Reference</span><span class="mono">' + esc(a.payment_ref) + '</span></div>' : "") +
      (a.paid_at ? '<div class="fee-row"><span>Paid on</span><span>' + fmtT(a.paid_at) + '</span></div>' : "") +
      (r.payments.length ? '<div style="margin-top:10px;font-size:13px">' + r.payments.map(p => '<div class="fee-row"><span>' + esc(p.gateway.toUpperCase()) + ' · ' + fmtT(p.created_at) + '</span><span>' + rupee(p.amount) + ' ' + badge(PSTAT, p.status) + '</span></div>').join("") + '</div>' : "") +
      (a.payment_status !== "paid" ? '<form id="cashForm" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><input id="cashReceipt" class="input" required placeholder="Office receipt no." style="flex:1;min-width:160px;min-height:42px"><button class="btn btn-sm" type="submit"><i class="fas fa-money-bill"></i> Mark cash received</button></form>' : "") +
      '</div>' +
      '<div class="adm-section-title">Details</div><div class="kv">' + LABELS.filter(([k]) => d[k]).map(([k, l]) => '<div><small>' + l + '</small><strong>' + esc(k === "dob" ? fmt(d[k]) : d[k]) + '</strong></div>').join("") + '</div>' +
      '<div class="adm-section-title">Update status</div><div class="form-grid">' +
      '<div class="field"><label for="dStatus">Status</label><select id="dStatus">' + Object.entries(STATUS).map(([k, v]) => '<option value="' + k + '"' + (k === a.status ? " selected" : "") + '>' + v[0] + '</option>').join("") + '</select></div>' +
      '<div class="field"><label for="dNote">Note to parent (shown on their dashboard)</label><input id="dNote" maxlength="300" placeholder="e.g. Bring original T.C. on Monday"></div></div>' +
      '<div class="adm-section-title">History</div><div class="adm-history">' + (a.history || []).slice().reverse().map(h => '<div>' + esc(h.note || h.status) + '<small>' + fmtT(h.at) + (h.by ? " · " + esc(h.by) : "") + '</small></div>').join("") + '</div>';
    openDrawer(a.reg_id + " · " + a.student_name, body,
      (ROLE === "admin" ? '<button class="btn btn-sm btn-danger" id="dDel" style="margin-right:auto"><i class="fas fa-trash"></i> Delete</button>' : "") +
      '<button class="btn btn-sm btn-outline" data-close>Close</button><button class="btn btn-sm" id="dSave"><i class="fas fa-check"></i> Save status</button>');
    $("#dSave").addEventListener("click", async e => {
      busy(e.currentTarget, true);
      try { await api("admin.apps.update", { regId, status: $("#dStatus").value, note: $("#dNote").value.trim() }); toast("Status updated"); closeDrawer(); route(); refreshCounts(); }
      catch (err) { toast(err.message, "error"); busy(e.currentTarget, false); }
    });
    const cf = $("#cashForm");
    cf && cf.addEventListener("submit", async e => {
      e.preventDefault();
      if (!confirm("Confirm " + rupee(a.fee_total) + " received in cash for " + regId + "?")) return;
      try { await api("admin.apps.cash", { regId, receiptNo: $("#cashReceipt").value.trim() }); toast("Payment recorded"); openApp(regId); route(); }
      catch (err) { toast(err.message, "error"); }
    });
    const del = $("#dDel");
    del && del.addEventListener("click", async () => {
      if (!confirm("Delete " + regId + " and its documents permanently?")) return;
      try { await api("admin.apps.delete", { regId }); toast("Deleted"); closeDrawer(); route(); }
      catch (err) { toast(err.message, "error"); }
    });
  }

  /* ============================================================ Payments */
  async function pagePayments() {
    const rows = (await api("admin.payments.list")).payments || [];
    const ok = rows.filter(p => p.status === "success" || p.status === "cash");
    content.innerHTML = '<div class="adm-kpis" style="margin-bottom:18px">' +
      kpi("fa-indian-rupee-sign", "Total received", rupee(ok.reduce((t, p) => t + Number(p.amount), 0)), ok.length + " payments", "gold") +
      kpi("fa-credit-card", "Online (PayU)", rupee(ok.filter(p => p.gateway === "payu").reduce((t, p) => t + Number(p.amount), 0)), ok.filter(p => p.gateway === "payu").length + " payments") +
      kpi("fa-money-bill", "Cash at office", rupee(ok.filter(p => p.gateway === "office").reduce((t, p) => t + Number(p.amount), 0)), ok.filter(p => p.gateway === "office").length + " payments", "blue") +
      kpi("fa-triangle-exclamation", "Failed / pending", rows.filter(p => p.status === "failure" || p.status === "pending").length, "attempts", "saffron") + '</div>' +
      '<div class="adm-toolbar"><button class="btn btn-sm btn-outline" id="expPay"><i class="fas fa-file-csv"></i> Export</button></div>' +
      '<div class="adm-card">' + (rows.length ? '<div class="adm-table-wrap"><table class="adm-table responsive"><thead><tr><th>Date</th><th>Reg. ID</th><th>Amount</th><th>Via</th><th>Status</th><th class="hide-xs">Txn / Ref</th></tr></thead><tbody>' +
      rows.map(p => '<tr class="click" data-reg="' + esc(p.reg_id) + '"><td>' + fmtT(p.created_at) + '</td><td class="mono">' + esc(p.reg_id) + '</td><td><b>' + rupee(p.amount) + '</b></td><td>' + (p.gateway === "payu" ? "PayU" + (p.mode === "test" ? " (test)" : "") : "Office") + '</td><td>' + badge(PSTAT, p.status) + '</td><td class="hide-xs mono" style="font-size:12px">' + esc(p.gateway_ref || p.txnid) + '</td></tr>').join("") +
      '</tbody></table></div>' : '<div class="adm-empty"><i class="fas fa-receipt"></i>No payments yet.</div>') + '</div>';
    bindAppRows();
    $("#expPay").addEventListener("click", () => csv(rows, [[r => fmtT(r.created_at), "Date"], ["reg_id", "Reg ID"], ["amount", "Amount"], ["gateway", "Gateway"], ["mode", "Mode"], ["status", "Status"], ["txnid", "Txn ID"], ["gateway_ref", "Gateway ref"]], "msi-payments"));
  }

  /* =========================================================== Enquiries */
  async function pageEnquiries() {
    const rows = (await api("admin.enquiries.list")).rows || [];
    content.innerHTML = '<div class="adm-list">' + (rows.length ? rows.map(q =>
      '<div class="adm-row"><div class="adm-row-main"><strong>' + esc(q.name) + ' · <a href="tel:' + esc(q.phone) + '">' + esc(q.phone) + '</a> ' + (q.status === "new" ? '<span class="chip chip-new">NEW</span>' : "") + '</strong>' +
      '<small>' + esc(q.subject || "General") + ' · ' + fmtT(q.created_at) + '</small><p style="margin-top:6px;font-size:14px;white-space:pre-wrap">' + esc(q.message) + '</p></div>' +
      '<div class="adm-row-actions"><a class="btn btn-xs btn-outline" target="_blank" rel="noopener" href="https://wa.me/91' + esc(q.phone) + '"><i class="fab fa-whatsapp"></i></a>' +
      '<button class="btn btn-xs ' + (q.status === "new" ? "" : "btn-outline") + '" data-enq="' + esc(q.id) + '" data-to="' + (q.status === "new" ? "resolved" : "new") + '">' + (q.status === "new" ? '<i class="fas fa-check"></i> Resolve' : "Reopen") + '</button></div></div>').join("")
      : '<div class="adm-card"><div class="adm-empty"><i class="fas fa-envelope-open"></i>No enquiries yet.</div></div>') + '</div>';
    $$("[data-enq]", content).forEach(b => b.addEventListener("click", async () => {
      busy(b, true);
      try { await api("admin.enquiries.update", { id: b.dataset.enq, status: b.dataset.to }); refreshCounts(); route(); }
      catch (err) { toast(err.message, "error"); busy(b, false); }
    }));
  }

  /* ========================================================== Users */
  async function pageUsers() {
    const rows = (await api("admin.users.list")).rows || [];
    content.innerHTML = '<div class="adm-card">' + (rows.length ? '<div class="adm-table-wrap"><table class="adm-table responsive"><thead><tr><th></th><th>Name</th><th>Email</th><th class="hide-xs">Joined</th><th class="hide-xs">Last sign-in</th></tr></thead><tbody>' +
      rows.map(u => '<tr><td>' + (u.photo_url ? '<img class="adm-avatar" src="' + esc(u.photo_url) + '" alt="" referrerpolicy="no-referrer">' : '<span class="adm-avatar" style="display:inline-block"></span>') + '</td><td><strong>' + esc(u.name || "—") + '</strong></td><td>' + esc(u.email) + '</td><td class="hide-xs">' + fmt(u.created_at) + '</td><td class="hide-xs">' + fmtT(u.last_login) + '</td></tr>').join("") +
      '</tbody></table></div>' : '<div class="adm-empty"><i class="fas fa-users"></i>No parent has signed in yet.</div>') + '</div>';
  }

  /* ============================================== Content CRUD (generic) */
  const CRUD = {
    notices: {
      title: "notice", folder: "notices",
      fields: [["title", "Title *", "text", true], ["body", "Details", "textarea"], ["category", "Category", "select", false, NCAT], ["published_on", "Date", "date"],
               ["link_url", "Link (optional)", "url"], ["file_url", "Attachment (PDF / image)", "file"], ["is_new", "Show “NEW” badge", "switch"], ["active", "Visible on website", "switch"]],
      defaults: () => ({ category: "general", published_on: new Date().toISOString().slice(0, 10), is_new: true, active: true }),
      row: n => '<div class="adm-row"><div class="adm-row-main"><strong>' + esc(n.title) + (n.active ? "" : ' <span class="chip chip-general">Hidden</span>') + (n.is_new ? ' <span class="chip chip-new">NEW</span>' : "") + '</strong><small>' + fmt(n.published_on) + ' · ' + esc(NCAT[n.category] || n.category) + (n.file_url ? ' · <i class="fas fa-paperclip"></i> attachment' : "") + '</small></div>'
    },
    toppers: {
      title: "topper", folder: "toppers",
      fields: [["name", "Student name *", "text", true], ["exam", "Exam *", "select", true, { "High School (Class 10)": "High School (Class 10)", "Intermediate (Class 12)": "Intermediate (Class 12)" }], ["stream", "Stream", "text"],
               ["percent", "Percentage", "number"], ["rank_text", "Rank / honour (e.g. College 1st)", "text"], ["year", "Year", "text"], ["photo_url", "Photo", "file"], ["sort", "Display order", "number"]],
      defaults: () => ({ exam: "Intermediate (Class 12)", year: String(new Date().getFullYear()), sort: 0 }),
      row: t => '<div class="adm-row">' + (t.photo_url ? '<img class="adm-avatar" src="' + esc(t.photo_url) + '" alt="">' : "") + '<div class="adm-row-main"><strong>' + esc(t.name) + (t.percent != null ? " · " + Number(t.percent).toFixed(1) + "%" : "") + '</strong><small>' + esc([t.exam, t.stream, t.year, t.rank_text].filter(Boolean).join(" · ")) + '</small></div>'
    },
    leaders: {
      title: "person", folder: "leaders",
      fields: [["name", "Name *", "text", true], ["role", "Designation *", "text", true], ["message", "Message (optional)", "textarea"], ["photo_url", "Photo", "file"], ["sort", "Display order", "number"]],
      defaults: () => ({ sort: 0 }),
      row: l => '<div class="adm-row">' + (l.photo_url ? '<img class="adm-avatar" src="' + esc(l.photo_url) + '" alt="">' : "") + '<div class="adm-row-main"><strong>' + esc(l.name) + '</strong><small>' + esc(l.role) + '</small></div>'
    }
  };
  async function pageCrud(table) {
    const cfg = CRUD[table];
    const rows = (await api("admin.crud.list", { table })).rows || [];
    content.innerHTML = '<div class="adm-toolbar"><button class="btn btn-sm" id="addRow"><i class="fas fa-plus"></i> Add ' + cfg.title + '</button></div>' +
      '<div class="adm-list">' + (rows.length ? rows.map(r => cfg.row(r) + '<div class="adm-row-actions"><button class="btn btn-xs btn-outline" data-edit="' + esc(r.id) + '"><i class="fas fa-pen"></i> Edit</button><button class="btn btn-xs btn-danger" data-del="' + esc(r.id) + '" aria-label="Delete"><i class="fas fa-trash"></i></button></div></div>').join("")
        : '<div class="adm-card"><div class="adm-empty"><i class="fas fa-folder-open"></i>Nothing here yet. Click “Add ' + cfg.title + '”.</div></div>') + '</div>';
    $("#addRow").addEventListener("click", () => crudForm(table, cfg.defaults()));
    $$("[data-edit]", content).forEach(b => b.addEventListener("click", () => crudForm(table, rows.find(r => r.id === b.dataset.edit))));
    $$("[data-del]", content).forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Delete this " + cfg.title + "?")) return;
      try { await api("admin.crud.delete", { table, id: b.dataset.del }); toast("Deleted"); route(); } catch (err) { toast(err.message, "error"); }
    }));
  }
  function fieldHtml([k, label, type, req, opts], v) {
    const id = "f_" + k, val = v == null ? "" : v;
    if (type === "textarea") return '<div class="field full"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" name="' + k + '" rows="4"' + (req ? " required" : "") + '>' + esc(val) + '</textarea></div>';
    if (type === "select") return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" name="' + k + '">' + Object.entries(opts).map(([ov, ol]) => '<option value="' + esc(ov) + '"' + (ov === val ? " selected" : "") + '>' + esc(ol) + '</option>').join("") + '</select></div>';
    if (type === "switch") return '<div class="field"><label class="adm-switch"><input type="checkbox" name="' + k + '"' + (val ? " checked" : "") + '><span class="track"></span> ' + label + '</label></div>';
    if (type === "file") return '<div class="field full"><label>' + label + '</label><input type="hidden" name="' + k + '" value="' + esc(val) + '"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><label class="btn btn-sm btn-outline" style="cursor:pointer"><i class="fas fa-upload"></i> Upload<input type="file" accept="image/*,application/pdf" data-upload-for="' + k + '" hidden></label>' +
      '<button type="button" class="btn btn-sm btn-outline" data-clear-file="' + k + '"' + (val ? "" : " hidden") + '>Remove</button><span class="adm-note" data-file-name="' + k + '">' + (val ? '<a href="' + esc(val) + '" target="_blank" rel="noopener">Current file</a>' : "No file") + '</span></div>' +
      (val && !/\.pdf$/i.test(val) ? '<img class="adm-preview" data-preview="' + k + '" src="' + esc(val) + '" alt="">' : '<img class="adm-preview" data-preview="' + k + '" hidden alt="">') + '</div>';
    return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + k + '" type="' + (type || "text") + '"' + (type === "number" ? ' step="any"' : "") + ' value="' + esc(val) + '"' + (req ? " required" : "") + '></div>';
  }
  function crudForm(table, row) {
    const cfg = CRUD[table];
    openDrawer((row.id ? "Edit " : "Add ") + cfg.title, '<form id="crudForm" class="form-grid" novalidate>' + cfg.fields.map(f => fieldHtml(f, row[f[0]])).join("") + '</form>',
      '<button class="btn btn-sm btn-outline" data-close>Cancel</button><button class="btn btn-sm" id="crudSave"><i class="fas fa-check"></i> Save</button>');
    const f = $("#crudForm");
    $$("[data-upload-for]", f).forEach(inp => inp.addEventListener("change", async () => {
      const k = inp.dataset.uploadFor, file = inp.files[0]; if (!file) return;
      const nameEl = $('[data-file-name="' + k + '"]', f); nameEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';
      try {
        const url = await upload(file, cfg.folder, 1600);
        f.elements[k].value = url;
        nameEl.innerHTML = '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(file.name) + '</a>';
        const pv = $('[data-preview="' + k + '"]', f); if (file.type.startsWith("image/")) { pv.src = url; pv.hidden = false; } else pv.hidden = true;
        $('[data-clear-file="' + k + '"]', f).hidden = false;
      } catch (err) { nameEl.textContent = "Upload failed"; toast(err.message, "error"); }
      inp.value = "";
    }));
    $$("[data-clear-file]", f).forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.clearFile; f.elements[k].value = ""; b.hidden = true;
      $('[data-file-name="' + k + '"]', f).textContent = "No file"; $('[data-preview="' + k + '"]', f).hidden = true;
    }));
    $("#crudSave").addEventListener("click", async e => {
      const out = row.id ? { id: row.id } : {};
      for (const [k, label, type, req] of cfg.fields) {
        const el = f.elements[k];
        let v = type === "switch" ? el.checked : el.value.trim();
        if (req && !v) { toast(label.replace(" *", "") + " is required", "error"); el.focus && el.focus(); return; }
        if (type === "number") v = v === "" ? null : Number(v);
        out[k] = v;
      }
      busy(e.currentTarget, true);
      try { await api("admin.crud.save", { table, row: out }); toast("Saved — live on the website"); closeDrawer(); route(); }
      catch (err) { toast(err.message, "error"); busy(e.currentTarget, false); }
    });
  }

  /* ============================================================ Gallery */
  const GCAT = { campus: "Campus", labs: "Labs & classrooms", sports: "Sports", events: "Events" };
  async function pageGallery() {
    const rows = (await api("admin.crud.list", { table: "gallery" })).rows || [];
    const src = u => /^https?:/.test(u) ? u : u;   // relative paths (images/...) work from admin.html too
    content.innerHTML = '<div class="adm-toolbar"><label class="btn btn-sm" style="cursor:pointer"><i class="fas fa-cloud-arrow-up"></i> Upload photos<input type="file" id="gUp" accept="image/*" multiple hidden></label>' +
      '<select id="gCat">' + Object.entries(GCAT).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join("") + '</select><span class="adm-note" id="gProg">' + rows.length + ' photos · drag order with “Display order” in Edit</span></div>' +
      '<div class="adm-media-grid">' + rows.map(g => '<div class="adm-media"><img src="' + esc(src(g.url)) + '" alt="" loading="lazy"><div class="adm-media-body"><strong>' + esc(g.caption || "—") + '</strong><span class="adm-note">' + esc(GCAT[g.category] || g.category) + ' · #' + g.sort + '</span></div>' +
        '<div class="adm-media-actions"><button data-gedit="' + esc(g.id) + '" aria-label="Edit"><i class="fas fa-pen"></i></button><button class="danger" data-gdel="' + esc(g.id) + '" aria-label="Delete"><i class="fas fa-trash"></i></button></div></div>').join("") + '</div>';
    $("#gUp").addEventListener("change", async e => {
      const files = Array.from(e.target.files); if (!files.length) return;
      let sort = rows.reduce((m, r) => Math.max(m, r.sort || 0), 0);
      for (let i = 0; i < files.length; i++) {
        $("#gProg").textContent = "Uploading " + (i + 1) + " of " + files.length + "…";
        try { const url = await upload(files[i], "gallery", 1800); await api("admin.crud.save", { table: "gallery", row: { url, caption: files[i].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), category: $("#gCat").value, sort: ++sort } }); }
        catch (err) { toast(files[i].name + ": " + err.message, "error"); }
      }
      toast("Photos uploaded"); route();
    });
    $$("[data-gdel]", content).forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Remove this photo from the gallery?")) return;
      try { await api("admin.crud.delete", { table: "gallery", id: b.dataset.gdel }); route(); } catch (err) { toast(err.message, "error"); }
    }));
    $$("[data-gedit]", content).forEach(b => b.addEventListener("click", () => {
      const g = rows.find(r => r.id === b.dataset.gedit);
      openDrawer("Edit photo", '<img src="' + esc(src(g.url)) + '" alt="" style="width:100%;border-radius:14px;margin-bottom:16px"><form id="gForm" class="form-grid">' +
        fieldHtml(["caption", "Caption", "text"], g.caption) + fieldHtml(["category", "Category", "select", false, GCAT], g.category) + fieldHtml(["sort", "Display order", "number"], g.sort) + '</form>',
        '<button class="btn btn-sm btn-outline" data-close>Cancel</button><button class="btn btn-sm" id="gSave"><i class="fas fa-check"></i> Save</button>');
      $("#gSave").addEventListener("click", async () => {
        const f = $("#gForm");
        try { await api("admin.crud.save", { table: "gallery", row: { id: g.id, url: g.url, caption: f.elements.caption.value.trim(), category: f.elements.category.value, sort: Number(f.elements.sort.value) || 0 } }); closeDrawer(); route(); }
        catch (err) { toast(err.message, "error"); }
      });
    }));
  }

  /* =========================================================== Settings */
  async function pageSettings() {
    const s = (await api("admin.settings.get")).settings || {};
    const c = s.contact || {}, st = s.stats || {}, fees = s.fees || {}, pay = s.payment || {}, mp = s.maps || {};
    const ro = ROLE !== "admin" ? " disabled" : "";
    const formFee = Object.values(fees).map(g => +((g || {}).form || 0)).find(v => v > 0) ?? 0;
    content.innerHTML = (ROLE !== "admin" ? '<div class="alert alert-info" style="margin-bottom:16px"><i class="fas fa-lock"></i><div>Only administrators can change settings.</div></div>' : "") +
      '<div class="adm-settings">' +
      card("Admissions", '<label class="adm-switch"><input type="checkbox" id="sOpen"' + (s.admissions_open !== false ? " checked" : "") + ro + '><span class="track"></span> Online admissions open</label>' +
        '<div class="field"><label for="sSession">Academic session</label><input id="sSession" value="' + esc(s.session || "") + '" placeholder="2027-28"' + ro + '></div>' +
        '<div class="field"><label for="sTicker">Homepage ticker (one line each)</label><textarea id="sTicker" rows="4"' + ro + '>' + esc((s.ticker || []).join("\n")) + '</textarea></div>') +
      card("Online payment — PayU", '<label class="adm-switch"><input type="checkbox" id="pEnabled"' + (pay.payuEnabled ? " checked" : "") + ro + '><span class="track"></span> Accept online payments (PayU)</label>' +
        '<div class="field"><label for="pMode">Mode</label><select id="pMode"' + ro + '><option value="live"' + (pay.payuMode === "live" ? " selected" : "") + '>Live — real money</option><option value="test"' + (pay.payuMode !== "live" ? " selected" : "") + '>Test — PayU sandbox</option></select></div>' +
        '<div class="field"><label for="pKey">Merchant key ' + (s.payuKeySet ? '<span class="adm-secret-ok"><i class="fas fa-circle-check"></i> saved</span>' : "") + '</label><input id="pKey" autocomplete="off" placeholder="' + (s.payuKeySet ? "•••••• (leave blank to keep)" : "From PayU → Developer → API Keys") + '"' + ro + '></div>' +
        '<div class="field"><label for="pSalt">Salt ' + (s.payuSaltSet ? '<span class="adm-secret-ok"><i class="fas fa-circle-check"></i> saved</span>' : "") + '</label><input id="pSalt" type="password" autocomplete="new-password" placeholder="' + (s.payuSaltSet ? "•••••• (leave blank to keep)" : "Paste salt") + '"' + ro + '></div>' +
        '<p class="adm-note">Key and salt are stored only on the server and are never sent to visitors. After regenerating the salt in PayU, paste the new one here.</p>' +
        '<label class="adm-switch"><input type="checkbox" id="pOffice"' + (pay.officeEnabled !== false ? " checked" : "") + ro + '><span class="track"></span> Allow “Pay at college office”</label>') +
      card("Registration fee", '<div class="field"><label for="feeForm">Registration form fee (₹) — same for Classes 6–12</label><input id="feeForm" type="number" min="0" step="1" value="' + esc(formFee) + '"' + ro + '></div>' +
        '<p class="adm-note">This is the only amount charged online when a parent submits the admission form. It applies to new applications.</p>') +
      card("Contact details", ['phone:Phone', 'whatsapp:WhatsApp number (with 91)', 'email:Email', 'address:Address', 'hours:Office hours'].map(x => { const [k, l] = x.split(":"); return '<div class="field"><label for="c_' + k + '">' + l + '</label><input id="c_' + k + '" value="' + esc(c[k] || "") + '"' + ro + '></div>'; }).join("")) +
      card("Homepage numbers & map", '<div class="form-grid">' + ['founded:Established', 'students:Students', 'teachers:Teachers', 'classrooms:Classrooms'].map(x => { const [k, l] = x.split(":"); return '<div class="field"><label for="st_' + k + '">' + l + '</label><input id="st_' + k + '" value="' + esc(st[k] || "") + '"' + ro + '></div>'; }).join("") +
        '<div class="field"><label for="m_lat">Map latitude</label><input id="m_lat" value="' + esc(mp.lat || "") + '"' + ro + '></div><div class="field"><label for="m_lng">Map longitude</label><input id="m_lng" value="' + esc(mp.lng || "") + '"' + ro + '></div>' +
        '<div class="field full"><label for="m_key">Google Maps API key (optional)</label><input id="m_key" value="' + esc(mp.apiKey || "") + '" placeholder="Leave empty to use the free Google Maps embed"' + ro + '></div></div>') +
      '</div>' + (ROLE === "admin" ? '<div style="position:sticky;bottom:16px;margin-top:18px;display:flex;justify-content:flex-end"><button class="btn btn-gold" id="saveSettings"><i class="fas fa-floppy-disk"></i> Save all settings</button></div>' : "");
    const save = $("#saveSettings");
    save && save.addEventListener("click", async () => {
      const ff = Math.max(0, Math.round(Number($("#feeForm").value) || 0));
      const feesOut = { middle: { form: ff }, high: { form: ff }, inter: { form: ff } };
      const payload = {
        settings: {
          admissions_open: $("#sOpen").checked, session: $("#sSession").value.trim(),
          ticker: $("#sTicker").value.split("\n").map(x => x.trim()).filter(Boolean),
          payment: { payuEnabled: $("#pEnabled").checked, payuMode: $("#pMode").value, officeEnabled: $("#pOffice").checked },
          fees: feesOut,
          contact: Object.fromEntries(["phone", "whatsapp", "email", "address", "hours"].map(k => [k, $("#c_" + k).value.trim()])),
          stats: Object.fromEntries(["founded", "students", "teachers", "classrooms"].map(k => [k, $("#st_" + k).value.trim()])),
          maps: { apiKey: $("#m_key").value.trim(), lat: Number($("#m_lat").value) || null, lng: Number($("#m_lng").value) || null }
        },
        payuKey: $("#pKey").value.trim(), payuSalt: $("#pSalt").value.trim()
      };
      if (payload.settings.payment.payuEnabled && payload.settings.payment.payuMode === "live" && !confirm("Online payments are LIVE — parents will be charged real money. Continue?")) return;
      busy(save, true);
      try { await api("admin.settings.save", payload); toast("Settings saved — live on the website"); route(); }
      catch (err) { toast(err.message, "error"); busy(save, false); }
    });
  }
  const card = (title, body) => '<div class="adm-card"><div class="adm-card-head"><h3>' + title + '</h3></div><div class="adm-card-body">' + body + '</div></div>';

  /* ============================================================== Staff */
  async function pageStaff() {
    const rows = (await api("admin.staff.list")).rows || [];
    content.innerHTML = (ROLE === "admin" ? '<div class="adm-card" style="margin-bottom:18px"><div class="adm-card-head"><h3>Give access</h3><span class="adm-note">They sign in with this Google account.</span></div><div class="adm-card-body"><form id="staffForm" class="form-grid">' +
      '<div class="field"><label for="sEmail">Google email *</label><input id="sEmail" type="email" required placeholder="teacher@gmail.com"></div>' +
      '<div class="field"><label for="sName">Name</label><input id="sName"></div>' +
      '<div class="field"><label for="sRole">Role</label><select id="sRole"><option value="staff">Staff — applications, content</option><option value="admin">Administrator — everything</option></select></div>' +
      '<div class="field" style="justify-content:flex-end"><button class="btn" type="submit"><i class="fas fa-user-plus"></i> Add</button></div></form></div></div>' : "") +
      '<div class="adm-list">' + rows.map(r => '<div class="adm-row"><div class="adm-row-main"><strong>' + esc(r.name || r.email) + '</strong><small>' + esc(r.email) + ' · ' + (r.role === "admin" ? "Administrator" : "Staff") + ' · since ' + fmt(r.created_at) + '</small></div>' +
        (ROLE === "admin" && r.email !== (ME && ME.email) ? '<div class="adm-row-actions"><button class="btn btn-xs btn-danger" data-rm="' + esc(r.email) + '"><i class="fas fa-user-minus"></i> Remove</button></div>' : "") + '</div>').join("") + '</div>';
    const f = $("#staffForm");
    f && f.addEventListener("submit", async e => {
      e.preventDefault();
      try { await api("admin.staff.save", { email: $("#sEmail").value, name: $("#sName").value, role: $("#sRole").value }); toast("Access granted"); route(); }
      catch (err) { toast(err.message, "error"); }
    });
    $$("[data-rm]", content).forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Remove access for " + b.dataset.rm + "?")) return;
      try { await api("admin.staff.delete", { email: b.dataset.rm }); route(); } catch (err) { toast(err.message, "error"); }
    }));
  }
})();
