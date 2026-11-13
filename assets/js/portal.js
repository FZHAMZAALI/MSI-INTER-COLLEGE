/* ==========================================================================
   Student portal: auth, multi-step registration, dashboard, tracking
   ========================================================================== */
(function () {
  "use strict";
  const CFG = window.MSI_CONFIG || {};
  const S = window.MSIStore;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const STATUS = {
    submitted: { label: "Submitted · जमा", cls: "status-submitted" },
    review:    { label: "Under review · जाँच में", cls: "status-review" },
    approved:  { label: "Approved · स्वीकृत", cls: "status-approved" },
    rejected:  { label: "Not approved · अस्वीकृत", cls: "status-rejected" }
  };
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch (_) { return iso; } };

  /* ---------- Mode notice ---------- */
  if (S.mode === "local") {
    $("#modeNotice").innerHTML =
      '<div class="alert alert-warn" style="margin-bottom:16px"><i class="fas fa-triangle-exclamation"></i><div><strong>Demo mode:</strong> registrations are saved only in this browser. ' +
      'To receive applications at the college, connect the Google Sheets backend (see <code>backend/README.md</code>).</div></div>';
  }

  /* ---------- Views ---------- */
  const titles = {
    auth:      ["Online Registration", "ऑनलाइन प्रवेश पंजीकरण — create an account, fill the form, and receive your Registration ID instantly."],
    dashboard: ["Student Dashboard", "आपके आवेदन — view your applications and their status."],
    apply:     ["Admission Form", "प्रवेश आवेदन पत्र — session " + CFG.SESSION + "."],
    success:   ["Registration Complete", "पंजीकरण सफल — keep your Registration ID safe."],
    track:     ["Track Application", "आवेदन स्थिति — no login needed."]
  };
  function show(view) {
    $$("[data-view]").forEach(v => { v.hidden = v.dataset.view !== view; });
    $("#portalTitle").textContent = titles[view][0];
    $("#portalSub").textContent = titles[view][1];
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "dashboard") renderDashboard();
  }
  $$("[data-go]").forEach(b => b.addEventListener("click", () => {
    const v = b.dataset.go;
    if (v === "apply") resetWizard();
    show(v);
  }));

  function route() {
    const h = location.hash.replace("#", "");
    const user = S.currentUser();
    if (h === "track") return show("track");
    if (user) {
      if (h === "apply") { resetWizard(); return show("apply"); }
      return user.regIds.length ? show("dashboard") : (resetWizard(), show("apply"));
    }
    show("auth");
    setAuthTab(h === "login" ? "login" : "signup");
  }
  window.addEventListener("hashchange", route);

  /* ---------- Auth ---------- */
  function setAuthTab(tab) {
    $$("[data-auth-tab]").forEach(t => t.classList.toggle("active", t.dataset.authTab === tab));
    $$("[data-auth-panel]").forEach(p => { p.hidden = p.dataset.authPanel !== tab; });
  }
  $$("[data-auth-tab]").forEach(t => t.addEventListener("click", () => setAuthTab(t.dataset.authTab)));

  $$(".pw-toggle").forEach(b => b.addEventListener("click", () => {
    const inp = b.parentElement.querySelector("input");
    const showPw = inp.type === "password";
    inp.type = showPw ? "text" : "password";
    b.innerHTML = '<i class="fas ' + (showPw ? "fa-eye-slash" : "fa-eye") + '"></i>';
    b.setAttribute("aria-label", showPw ? "Hide password" : "Show password");
  }));

  function busy(btn, on, text) {
    if (on) { btn.dataset.html = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (text || "Please wait…"); btn.disabled = true; }
    else { btn.innerHTML = btn.dataset.html; btn.disabled = false; }
  }

  $("#signupForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target;
    const p2 = $("#suPass2");
    p2.setCustomValidity(p2.value && p2.value !== $("#suPass").value ? "mismatch" : "");
    if (!validateFields(f)) return;
    if (!$("#suAgree").checked) return toast("Please accept the declaration to continue.", "error");
    const btn = f.querySelector("[type=submit]"); busy(btn, true);
    try {
      const d = Object.fromEntries(new FormData(f));
      const u = await S.signUp(d);
      toast("खाता बन गया! Welcome, " + u.name.split(" ")[0] + ".");
      f.reset();
      prefillFromUser(u);
      resetWizard(); show("apply");
      history.replaceState(null, "", "#apply");
    } catch (err) { toast(err.message, "error"); }
    finally { busy(btn, false); }
  });

  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target;
    if (!validateFields(f)) return;
    const btn = f.querySelector("[type=submit]"); busy(btn, true);
    try {
      const u = await S.signIn(Object.fromEntries(new FormData(f)));
      toast("Welcome back, " + u.name.split(" ")[0] + "!");
      f.reset();
      history.replaceState(null, "", "#dashboard");
      route();
    } catch (err) { toast(err.message, "error"); }
    finally { busy(btn, false); }
  });

  $("#logoutBtn").addEventListener("click", () => {
    S.signOut(); toast("Logged out."); history.replaceState(null, "", "#login"); route();
  });

  /* ---------- Wizard ---------- */
  const form = $("#applyForm");
  const steps = $$(".form-step", form);
  const stepperItems = $$(".stepper-item");
  const prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn");
  let cur = 1;

  // DOB limits: 2 to 22 years old
  const today = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  $("#dob").max = iso(new Date(today.getFullYear() - 2, today.getMonth(), today.getDate()));
  $("#dob").min = iso(new Date(today.getFullYear() - 22, today.getMonth(), today.getDate()));

  function prefillFromUser(u) {
    if (!u) return;
    if (!$("#phone").value) $("#phone").value = u.phone || "";
    if (!$("#email").value) $("#email").value = u.email || "";
  }

  function resetWizard() {
    form.reset();
    $("#city").value = "Gorakhpur";
    $("#declare").checked = false;
    $$(".field.invalid", form).forEach(f => f.classList.remove("invalid"));
    toggleStream();
    prefillFromUser(S.currentUser());
    go(1);
  }

  function go(n) {
    cur = n;
    steps.forEach(s => s.classList.toggle("active", +s.dataset.step === n));
    stepperItems.forEach((it, i) => { it.classList.toggle("active", i + 1 === n); it.classList.toggle("done", i + 1 < n); });
    prevBtn.style.visibility = n === 1 ? "hidden" : "visible";
    nextBtn.innerHTML = n === steps.length ? '<i class="fas fa-paper-plane"></i> Submit registration' : 'Continue <i class="fas fa-arrow-right"></i>';
    nextBtn.classList.toggle("btn-gold", n === steps.length);
    if (n === steps.length) renderReview();
    const card = form.closest(".card");
    card && card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function classGroup() {
    const opt = $("#applyClass").selectedOptions[0];
    return opt ? opt.dataset.g : "";
  }
  function toggleStream() {
    const inter = classGroup() === "inter";
    const sf = $("#streamField");
    sf.hidden = !inter;
    if (inter) $("#streamGroup").setAttribute("data-required-radio", "");
    else { $("#streamGroup").removeAttribute("data-required-radio"); $$("input[name=stream]").forEach(r => r.checked = false); sf.classList.remove("invalid"); }
  }
  $("#applyClass").addEventListener("change", toggleStream);

  prevBtn.addEventListener("click", () => cur > 1 && go(cur - 1));
  nextBtn.addEventListener("click", async () => {
    if (cur < steps.length) {
      if (validateFields(steps[cur - 1])) go(cur + 1);
      return;
    }
    if (!$("#declare").checked) return toast("कृपया घोषणा स्वीकार करें · Please accept the declaration.", "error");
    busy(nextBtn, true, "Submitting…");
    try {
      const data = collect();
      const app = await S.submitApplication(data, (S.currentUser() || {}).id);
      onSubmitted(app);
    } catch (err) {
      toast("Could not submit: " + err.message, "error");
    } finally { busy(nextBtn, false); }
  });

  function collect() {
    const d = Object.fromEntries(new FormData(form));
    d.hostel = d.hostel ? "Yes" : "No";
    d.transport = d.transport ? "Yes" : "No";
    d.stream = d.stream || "";
    Object.keys(d).forEach(k => { if (typeof d[k] === "string") d[k] = d[k].trim(); });
    return d;
  }

  function fees(group) {
    const f = (CFG.FEES || {})[group] || { admission: 0, tuition: 0, lab: 0, library: 0 };
    return Object.assign({}, f, { total: f.admission + f.tuition + f.lab + f.library });
  }

  const LABELS = [
    ["studentName", "Student name"], ["gender", "Gender"], ["dob", "Date of birth"], ["category", "Category"],
    ["applyClass", "Class"], ["stream", "Stream"], ["medium", "Medium"],
    ["fatherName", "Father / Guardian"], ["motherName", "Mother"], ["phone", "Mobile"], ["email", "Email"],
    ["address", "Address"], ["city", "City"], ["pincode", "PIN"],
    ["prevSchool", "Previous school"], ["prevClass", "Last class"], ["prevPercent", "Percentage"],
    ["hostel", "Hostel"], ["transport", "Transport"]
  ];
  function renderReview() {
    const d = collect();
    $("#reviewGrid").innerHTML = LABELS.filter(([k]) => d[k]).map(([k, l]) =>
      "<div><small>" + l + "</small><strong>" + esc(k === "dob" ? fmtDate(d[k]) : d[k]) + "</strong></div>").join("");
    const f = fees(classGroup());
    $("#feeBox").innerHTML =
      '<div style="font-weight:700;color:var(--emerald-900);margin-bottom:8px"><i class="fas fa-indian-rupee-sign"></i> Estimated fee at admission · अनुमानित शुल्क</div>' +
      '<div class="fee-row"><span>Admission fee</span><span>₹' + f.admission + '</span></div>' +
      '<div class="fee-row"><span>Tuition (monthly)</span><span>₹' + f.tuition + '</span></div>' +
      (f.lab ? '<div class="fee-row"><span>Lab / computer fee</span><span>₹' + f.lab + '</span></div>' : "") +
      '<div class="fee-row"><span>Library &amp; sports fund</span><span>₹' + f.library + '</span></div>' +
      '<div class="fee-row total"><span>Total payable at office</span><span>₹' + f.total + '</span></div>' +
      '<div style="font-size:12.5px;color:var(--ink-500);margin-top:6px">Indicative only — the college office will confirm the final fee. No online payment is collected.</div>';
  }

  /* ---------- Success & slip ---------- */
  let lastApp = null;
  function onSubmitted(app) {
    lastApp = app;
    $("#successId").textContent = app.regId;
    const msg = "M.S.I. Inter College — Registration ID: " + app.regId + "\nStudent: " + app.studentName + "\nClass: " + app.applyClass + (app.stream ? " (" + app.stream + ")" : "") + "\nSession: " + app.session;
    $("#waShare").href = "https://wa.me/?text=" + encodeURIComponent(msg);
    buildReceipt(app);
    show("success");
    history.replaceState(null, "", "#success");
  }
  $("#printBtn").addEventListener("click", () => { if (lastApp) { buildReceipt(lastApp); window.print(); } });

  function buildReceipt(a) {
    const f = fees(groupOf(a.applyClass));
    const rows = LABELS.filter(([k]) => a[k]).map(([k, l]) => "<tr><td style='width:35%'><b>" + l + "</b></td><td>" + esc(k === "dob" ? fmtDate(a[k]) : a[k]) + "</td></tr>").join("");
    $("#receipt").innerHTML =
      "<div class='r-head'><img src='assets/img/crest.svg' width='64' height='64' alt=''><div><h2>मियाँ साहब इस्लामिया इण्टर कॉलेज</h2>" +
      "<div>M.S.I. Inter College, Bakshipur, Gorakhpur (U.P.) – 273001 · UDISE+ 09580400102</div></div></div>" +
      "<h3 style='margin-top:16px'>Online Registration Slip — Session " + esc(a.session) + "</h3>" +
      "<p><b>Registration ID:</b> <span style='font-family:monospace;font-size:18px'>" + esc(a.regId) + "</span> &nbsp; <b>Date:</b> " + fmtDate(a.createdAt) + "</p>" +
      "<table>" + rows + "<tr><td><b>Estimated fee at admission</b></td><td>₹" + f.total + " (to be confirmed by office)</td></tr></table>" +
      "<p style='margin-top:16px;font-size:12px'>Bring this slip with original documents (mark sheet, T.C., birth certificate, Aadhaar, 4 photographs) to the college office for verification. " +
      "Admission is confirmed only after verification and fee deposit.</p>" +
      "<div class='r-foot'><span>Applicant's signature</span><span>Office verification (signature &amp; seal)</span></div>";
  }
  function groupOf(cls) {
    const o = $$("#applyClass option").find(x => x.textContent === cls);
    return o ? o.dataset.g : "";
  }

  /* ---------- Dashboard ---------- */
  async function renderDashboard() {
    const u = S.currentUser();
    if (!u) return route();
    $("#dashAvatar").textContent = (u.name || "?").trim().charAt(0).toUpperCase();
    $("#dashName").textContent = u.name;
    $("#dashMeta").textContent = u.email + " · " + u.phone;
    const box = $("#dashApps");
    box.innerHTML = '<div class="card empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div>';
    let apps = [];
    try { apps = await S.myApplications(u); } catch (e) { toast(e.message, "error"); }
    if (!apps.length) {
      box.innerHTML = '<div class="card empty-state"><i class="fas fa-folder-open"></i><p style="margin-bottom:16px">No applications yet · अभी कोई आवेदन नहीं</p><button class="btn" id="emptyApply"><i class="fas fa-plus"></i> Start application</button></div>';
      $("#emptyApply").addEventListener("click", () => { resetWizard(); show("apply"); });
      return;
    }
    box.innerHTML = apps.map(appCard).join("");
    $$("[data-print]", box).forEach(b => b.addEventListener("click", () => {
      const a = apps.find(x => x.regId === b.dataset.print); buildReceipt(a); window.print();
    }));
  }

  function appCard(a) {
    const st = STATUS[a.status] || STATUS.submitted;
    return '<article class="card">' +
      '<div class="dash-head"><div><small style="color:var(--ink-500);font-size:12px;letter-spacing:.08em;text-transform:uppercase">Registration ID</small>' +
      '<div class="mono" style="font-family:ui-monospace,Menlo,monospace;font-size:1.2rem;font-weight:700;color:var(--emerald-900)">' + esc(a.regId) + '</div></div>' +
      '<span class="status-badge ' + st.cls + '">' + st.label + '</span></div>' +
      '<div class="dash-grid" style="margin-top:22px">' +
      '<div class="kv">' +
        kv("Student", a.studentName) + kv("Class", a.applyClass + (a.stream ? " · " + a.stream : "")) +
        kv("Medium", a.medium) + kv("Session", a.session) + kv("Submitted", fmtDate(a.createdAt)) + kv("Mobile", a.phone) +
      '</div>' + tracker(a) + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;padding-top:18px;border-top:1px solid var(--line)">' +
      '<button class="btn btn-sm btn-outline" data-print="' + esc(a.regId) + '"><i class="fas fa-print"></i> Print slip</button></div>' +
      '</article>';
  }
  const kv = (k, v) => "<div><small>" + k + "</small><strong>" + esc(v || "—") + "</strong></div>";

  function tracker(a) {
    const order = ["submitted", "review", "approved"];
    const s = a.status;
    const idx = s === "rejected" ? 2 : order.indexOf(s);
    const hist = a.history || [];
    const when = st => { const h = hist.filter(x => x.status === st).pop(); return h ? fmtDate(h.at) : ""; };
    const note = (hist[hist.length - 1] || {}).note;
    const items = [
      ["Application submitted", "आवेदन जमा", "submitted", "fa-paper-plane"],
      ["Document verification", "दस्तावेज़ जाँच", "review", "fa-file-circle-check"],
      s === "rejected" ? ["Not approved", "अस्वीकृत", "rejected", "fa-xmark"] : ["Admission approved", "प्रवेश स्वीकृत", "approved", "fa-graduation-cap"]
    ];
    return '<div class="status-track">' + items.map((it, i) => {
      const cls = i < idx ? "done" : i === idx ? (s === "rejected" ? "rejected" : s === "approved" ? "done" : "current") : "";
      return '<div class="track-item ' + cls + '"><span class="track-dot"><i class="fas ' + it[3] + '"></i></span><div><strong>' + it[0] + '</strong><span>' + it[1] + (when(it[2]) ? " · " + when(it[2]) : "") + '</span></div></div>';
    }).join("") + (note && s !== "submitted" ? '<div class="alert alert-info" style="margin-top:14px"><i class="fas fa-comment"></i><div><strong>Office note:</strong> ' + esc(note) + '</div></div>' : "") + '</div>';
  }

  /* ---------- Track ---------- */
  $("#trackForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target;
    if (!validateFields(f)) return;
    const btn = f.querySelector("[type=submit]"); busy(btn, true, "Checking…");
    const out = $("#trackResult");
    try {
      const d = Object.fromEntries(new FormData(f));
      const a = await S.findApplication(d.regId, d.phone);
      out.innerHTML = a ? appCard(a).replace('class="card"', 'class="card" style="box-shadow:none;background:var(--sand-50)"')
        : '<div class="alert alert-error"><i class="fas fa-circle-xmark"></i><div>No application found for this Registration ID and mobile number. ' +
          (S.mode === "local" ? "In demo mode, applications are visible only on the device they were submitted from." : "Please check and try again.") + '</div></div>';
      $$("[data-print]", out).forEach(b => b.addEventListener("click", () => { buildReceipt(a); window.print(); }));
    } catch (err) { out.innerHTML = '<div class="alert alert-error"><i class="fas fa-circle-xmark"></i><div>' + esc(err.message) + '</div></div>'; }
    finally { busy(btn, false); }
  });

  route();
})();
