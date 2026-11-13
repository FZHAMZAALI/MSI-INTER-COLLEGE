/* ==========================================================================
   Student portal — Google Sign-in, 5-step admission form with uploads,
   PayU payment, printable application form & receipt, dashboard, tracking.
   All data lives in the database via the server API (window.MSI).
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = iso => { if (!iso) return ""; const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso); return isNaN(d) ? iso : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
  const fmtDateTime = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN");
  const CLASS_GROUP = { "Class 6": "middle", "Class 7": "middle", "Class 8": "middle", "Class 9": "high", "Class 10": "high", "Class 11": "inter", "Class 12": "inter" };

  const STATUS = {
    submitted: { label: "Submitted", cls: "status-submitted" },
    review:    { label: "Under review", cls: "status-review" },
    approved:  { label: "Approved", cls: "status-approved" },
    rejected:  { label: "Not approved", cls: "status-rejected" }
  };
  const PAYSTATUS = {
    unpaid:  { label: "Fee unpaid", cls: "status-rejected" },
    pending: { label: "Payment processing", cls: "status-review" },
    office:  { label: "Pay at office", cls: "status-submitted" },
    paid:    { label: "Fee paid", cls: "status-approved" },
    failed:  { label: "Payment failed", cls: "status-rejected" }
  };

  let SITE = { settings: {} };
  let payApp = null, doneApp = null, dashApps = [];
  const S = () => SITE.settings || {};
  const session = () => S().session || "";

  /* ---------- Views ---------- */
  const titles = {
    auth:      ["Online Registration", "sign in with Google, fill the form, pay the fee and get your Registration ID instantly."],
    dashboard: ["Student Dashboard", "applications, fee payment and status."],
    apply:     ["Admission Form", "Admission Form"],
    payment:   ["Fee Payment", "pay securely online or at the college office."],
    done:      ["Registration Complete", "print your application form and keep your Registration ID safe."],
    track:     ["Track Application", "no sign-in needed."]
  };
  function show(view) {
    $$("[data-view]").forEach(v => { v.hidden = v.dataset.view !== view; });
    $("#portalTitle").textContent = titles[view][0];
    $("#portalSub").textContent = view === "apply" ? titles.apply[1] + " — session " + session() + "." : titles[view][1];
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "dashboard") renderDashboard();
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-go]"); if (!b) return;
    const v = b.dataset.go;
    if (v === "apply" && S().admissions_open === false) return toast("Admissions are closed.", "error");
    history.replaceState(null, "", "#" + v);
    route();
  });

  function route() {
    const h = location.hash.replace("#", "");
    if (h.startsWith("payresult=")) return handlePayResult(h);
    if (h === "track") return show("track");
    if (!MSI.auth.isReady) return;                 // wait for Google Sign-in
    if (!MSI.auth.user) return show("auth");
    if (h === "apply" && S().admissions_open !== false) { resetWizard(); return show("apply"); }
    if (h === "payment" && payApp) return show("payment");
    if (h === "done" && doneApp) return show("done");
    show("dashboard");
  }
  window.addEventListener("hashchange", route);

  function busy(btn, on, text) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (text || "Please wait…"); btn.disabled = true; }
    else if (btn.dataset.html) { btn.innerHTML = btn.dataset.html; btn.disabled = false; }
  }

  /* ---------- Auth (Sign in with Google + One Tap) ---------- */
  MSI.auth.renderButton($("#googleBtn"), { text: "continue_with" });
  $("#logoutBtn").addEventListener("click", async () => {
    await MSI.auth.signOut(); toast("Signed out."); history.replaceState(null, "", "#"); route();
  });

  let lastUid = null;
  MSI.auth.onChange(user => {
    if (user && user.uid !== lastUid) {
      lastUid = user.uid;
      MSI.api("me").catch(err => toast(err.message, "error"));   // register profile
      const h = location.hash;
      if (!h || h === "#" || h === "#login" || h === "#signup") history.replaceState(null, "", "#dashboard");
    }
    if (!user) lastUid = null;
    route();
  });
  MSI.auth.ready().then(ok => {
    if (!ok) {
      $("#googleBtn").innerHTML = "";
      $("#modeNotice").insertAdjacentHTML("afterbegin", '<div class="alert alert-warn" style="margin-bottom:16px"><i class="fas fa-triangle-exclamation"></i><div><strong>Google Sign-in is being set up.</strong> Online registration will open shortly — you can still <a href="#track"><b>track an application</b></a> or contact the office.</div></div>');
    }
  });

  MSI.site().then(d => {
    SITE = d;
    $$("[data-session]").forEach(el => el.textContent = session());
    if (S().admissions_open === false) {
      $("#modeNotice").insertAdjacentHTML("beforeend", '<div class="alert alert-warn" style="margin-bottom:16px"><i class="fas fa-calendar-xmark"></i><div><strong>Admissions are currently closed.</strong> You can still view your applications and pay pending fees.</div></div>');
    }
    route();
  }).catch(err => toast(err.message, "error"));

  /* ---------- File uploads (client-side compression) ---------- */
  const uploads = {};
  const readAsDataURL = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("Could not read file")); r.readAsDataURL(file); });
  async function compressImage(file, maxDim, quality) {
    const url = await readAsDataURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Unsupported image")); i.src = url; });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  }
  async function processFile(file, kind) {
    if (file.type === "application/pdf") { if (file.size > 3 * 1024 * 1024) throw new Error("PDF too large — max 3 MB"); return readAsDataURL(file); }
    if (!/^image\//.test(file.type)) throw new Error("Please choose an image (JPG/PNG) or PDF");
    return kind === "photo" ? compressImage(file, 480, 0.82) : compressImage(file, 1400, 0.72);
  }
  $$("[data-upload]").forEach(field => {
    const kind = field.dataset.upload, input = field.querySelector("input[type=file]");
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0]; if (!file) return;
      const box = field.querySelector(".upload-box"); box.classList.add("loading");
      try {
        uploads[kind] = await processFile(file, kind);
        field.classList.remove("invalid"); box.classList.add("has-file");
        const img = box.querySelector("img");
        if (img) { img.src = uploads[kind]; img.hidden = false; box.querySelector(".upload-empty").hidden = true; }
        const done = box.querySelector(".upload-done");
        if (done) {
          box.querySelector(".upload-empty").hidden = true; done.hidden = false;
          done.innerHTML = '<i class="fas fa-circle-check"></i><span><strong>' + esc(file.name.slice(0, 40)) + '</strong><small>' + Math.round(uploads[kind].length * 0.75 / 1024) + ' KB · tap to change</small></span>';
        }
      } catch (err) { toast(err.message, "error"); delete uploads[kind]; }
      finally { box.classList.remove("loading"); input.value = ""; }
    });
  });
  function clearUploads() {
    Object.keys(uploads).forEach(k => delete uploads[k]);
    $$("[data-upload]").forEach(f => {
      const box = f.querySelector(".upload-box"); box.classList.remove("has-file");
      const img = box.querySelector("img"); if (img) { img.hidden = true; img.removeAttribute("src"); }
      const done = box.querySelector(".upload-done"); if (done) done.hidden = true;
      box.querySelector(".upload-empty").hidden = false;
    });
  }

  /* ---------- Wizard ---------- */
  const form = $("#applyForm"), steps = $$(".form-step", form), stepperItems = $$(".stepper-item");
  const prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn");
  let cur = 1;
  const today = new Date(), iso = d => d.toISOString().slice(0, 10);
  $("#dob").max = iso(new Date(today.getFullYear() - 8, today.getMonth(), today.getDate()));
  $("#dob").min = iso(new Date(today.getFullYear() - 22, today.getMonth(), today.getDate()));

  function resetWizard() {
    form.reset();
    $("#city").value = "Gorakhpur"; $("#nationality").value = "Indian";
    $("#declare").checked = false;
    $$(".field.invalid", form).forEach(f => f.classList.remove("invalid"));
    clearUploads(); toggleStream();
    const u = MSI.auth.user; if (u && u.email) $("#email").value = u.email;
    go(1);
  }
  function go(n) {
    cur = n;
    steps.forEach(s => s.classList.toggle("active", +s.dataset.step === n));
    stepperItems.forEach((it, i) => { it.classList.toggle("active", i + 1 === n); it.classList.toggle("done", i + 1 < n); });
    prevBtn.style.visibility = n === 1 ? "hidden" : "visible";
    nextBtn.innerHTML = n === steps.length ? '<i class="fas fa-paper-plane"></i> Submit &amp; proceed to payment' : 'Continue <i class="fas fa-arrow-right"></i>';
    nextBtn.classList.toggle("btn-gold", n === steps.length);
    if (n === steps.length) renderReview();
    const card = form.closest(".card"); card && card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const classGroup = () => CLASS_GROUP[$("#applyClass").value] || "";
  function toggleStream() {
    const inter = classGroup() === "inter", sf = $("#streamField");
    sf.hidden = !inter;
    if (inter) $("#streamGroup").setAttribute("data-required-radio", "");
    else { $("#streamGroup").removeAttribute("data-required-radio"); $$("input[name=stream]").forEach(r => r.checked = false); sf.classList.remove("invalid"); }
  }
  $("#applyClass").addEventListener("change", toggleStream);
  function validateStep(n) {
    let ok = validateFields(steps[n - 1]);
    $$("[data-required-upload]", steps[n - 1]).forEach(f => {
      if (!uploads[f.dataset.upload]) { f.classList.add("invalid"); if (ok) f.scrollIntoView({ behavior: "smooth", block: "center" }); ok = false; }
    });
    return ok;
  }
  prevBtn.addEventListener("click", () => cur > 1 && go(cur - 1));
  nextBtn.addEventListener("click", async () => {
    if (cur < steps.length) { if (validateStep(cur)) go(cur + 1); return; }
    if (!$("#declare").checked) return toast("Please accept the declaration.", "error");
    busy(nextBtn, true, "Uploading & submitting…");
    try {
      const files = {};
      ["photo", "marksheet", "aadhaarDoc", "tc", "birthCert"].forEach(k => { if (uploads[k]) files[k] = uploads[k]; });
      const r = await MSI.api("apps.submit", { data: collect(), files });
      const app = Object.assign(r.application, { photoUrl: uploads.photo });
      toast("Application submitted · Registration ID " + app.regId);
      openPayment(app);
    } catch (err) { toast("Could not submit: " + err.message, "error"); }
    finally { busy(nextBtn, false); }
  });
  function collect() {
    const d = Object.fromEntries(new FormData(form));
    d.hostel = d.hostel ? "Yes" : "No"; d.stream = d.stream || "";
    Object.keys(d).forEach(k => { if (typeof d[k] === "string") d[k] = d[k].trim(); });
    return d;
  }

  const LABELS = [
    ["studentName", "Student name"], ["dob", "Date of birth"],
    ["category", "Category"], ["religion", "Religion"], ["nationality", "Nationality"], ["bloodGroup", "Blood group"],
    ["aadhaar", "Aadhaar No."], ["applyClass", "Class"], ["stream", "Stream"], ["medium", "Medium"],
    ["fatherName", "Father / Guardian"], ["motherName", "Mother"], ["guardianOccupation", "Occupation"],
    ["annualIncome", "Annual income"], ["phone", "Mobile"], ["altPhone", "Alt. mobile"], ["email", "Email"],
    ["address", "Address"], ["city", "City / District"], ["pincode", "PIN"],
    ["prevSchool", "Previous school"], ["prevBoard", "Previous board"], ["prevClass", "Last class passed"], ["prevPercent", "Percentage"],
    ["hostel", "Hostel"]
  ];
  const maskAadhaar = v => v ? "XXXX XXXX " + String(v).slice(-4) : "";
  const flat = a => Object.assign({}, a.data || {}, a);

  function feesFor(cls) {
    const f = (S().fees || {})[CLASS_GROUP[cls]] || {};
    return { admission: +f.admission || 0, tuition: +f.tuition || 0, lab: +f.lab || 0, library: +f.library || 0 };
  }
  function feeBoxHtml(f, total) {
    total = total != null ? total : f.admission + f.tuition + f.lab + f.library;
    return '<div style="font-weight:700;color:var(--emerald-900);margin-bottom:8px"><i class="fas fa-indian-rupee-sign"></i> Fee at registration</div>' +
      (f.admission ? '<div class="fee-row"><span>Admission fee</span><span>' + rupee(f.admission) + '</span></div>' : "") +
      (f.tuition ? '<div class="fee-row"><span>Tuition (first month)</span><span>' + rupee(f.tuition) + '</span></div>' : "") +
      (f.lab ? '<div class="fee-row"><span>Lab / computer fee</span><span>' + rupee(f.lab) + '</span></div>' : "") +
      (f.library ? '<div class="fee-row"><span>Library &amp; sports fund</span><span>' + rupee(f.library) + '</span></div>' : "") +
      '<div class="fee-row total"><span>Total payable</span><span>' + rupee(total) + '</span></div>';
  }
  function renderReview() {
    const d = collect();
    $("#reviewGrid").innerHTML =
      (uploads.photo ? '<div class="review-photo"><img src="' + uploads.photo + '" alt="Student photo"></div>' : "") +
      LABELS.filter(([k]) => d[k]).map(([k, l]) => "<div><small>" + l + "</small><strong>" + esc(k === "dob" ? fmtDate(d[k]) : k === "aadhaar" ? maskAadhaar(d[k]) : d[k]) + "</strong></div>").join("") +
      '<div><small>Documents uploaded</small><strong>' + ["marksheet", "aadhaarDoc", "tc", "birthCert"].filter(k => uploads[k]).length + ' of 4</strong></div>';
    $("#feeBox").innerHTML = feeBoxHtml(feesFor(d.applyClass));
  }

  /* ---------- Payment ---------- */
  function openPayment(app) {
    payApp = app;
    if (app.paymentStatus === "paid" || !(app.feeTotal > 0)) return showDone(app);
    $("#payRegId").textContent = app.regId;
    $("#payStudent").textContent = app.studentName + " · " + app.applyClass + (app.stream ? " (" + app.stream + ")" : "");
    $("#payAmount").textContent = rupee(app.feeTotal);
    $("#payFeeBox").innerHTML = feeBoxHtml(Object.assign({ admission: 0, tuition: 0, lab: 0, library: 0 }, app.feeBreakup || {}), app.feeTotal);
    const p = S().payment || {};
    $('[data-method="payu"]').hidden = !p.payuEnabled;
    $('[data-method="office"]').hidden = p.officeEnabled === false || app.paymentStatus === "office";
    $("#payNone").hidden = !!p.payuEnabled;
    $$(".pay-method").forEach(b => b.classList.remove("active"));
    history.replaceState(null, "", "#payment");
    show("payment");
  }
  $("#payMethods").addEventListener("click", async e => {
    const b = e.target.closest(".pay-method"); if (!b || !payApp) return;
    $$(".pay-method").forEach(x => x.classList.toggle("active", x === b));
    try {
      if (b.dataset.method === "payu") {
        busy(b, true, "Connecting to PayU…");
        const r = await MSI.api("pay.init", { regId: payApp.regId, returnUrl: location.href.split("#")[0] });
        const f = document.createElement("form");
        f.method = "POST"; f.action = r.action; f.style.display = "none";
        Object.entries(r.fields).forEach(([k, v]) => { const i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = v; f.appendChild(i); });
        document.body.appendChild(f); f.submit();          // redirect to PayU checkout
      } else if (b.dataset.method === "office") {
        if (!confirm("Pay " + rupee(payApp.feeTotal) + " at the college office? Your seat is confirmed only after the fee is paid.")) return;
        busy(b, true); await MSI.api("pay.office", { regId: payApp.regId });
        busy(b, false); showDone(Object.assign({}, payApp, { paymentStatus: "office" }));
      }
    } catch (err) { busy(b, false); toast(err.message, "error"); }
  });

  /* Back from PayU: #payresult=success&reg=MSI26-XXXXXX */
  async function handlePayResult(h) {
    const q = new URLSearchParams(h);
    const result = q.get("payresult"), reg = q.get("reg");
    await MSI.auth.ready();
    if (!MSI.auth.isReady) return;
    if (!MSI.auth.user) { show("auth"); return; }
    history.replaceState(null, "", "#dashboard");
    try {
      const r = await MSI.api("apps.mine");
      dashApps = r.applications || [];
      const app = dashApps.find(a => a.regId === reg);
      if (!app) return route();
      if (result === "success") toast("Payment successful!");
      else if (result === "pending") toast("Payment received — confirmation pending. It will update shortly.");
      else toast("Payment was not completed. You can try again.", "error");
      result === "failure" ? openPayment(app) : showDone(app);
    } catch (err) { toast(err.message, "error"); route(); }
  }

  /* ---------- Done ---------- */
  function showDone(app) {
    doneApp = app;
    const ps = app.paymentStatus || "unpaid";
    $("#doneId").textContent = app.regId;
    const icon = $("#doneIcon");
    icon.className = "success-icon" + (ps === "paid" ? "" : " pending");
    icon.innerHTML = '<i class="fas ' + (ps === "paid" ? "fa-check" : "fa-hourglass-half") + '"></i>';
    $("#doneTitle").textContent = ps === "paid" ? "Registration & payment complete!" : "Registration submitted!";
    $("#doneText").textContent = ps === "paid"
      ? "Print your application form and fee receipt and bring them with original documents."
      : ps === "pending" ? "Your payment is being confirmed with the bank. The dashboard will show 'Fee paid' once confirmed."
      : ps === "office" ? "Please pay " + rupee(app.feeTotal) + " at the college fee counter with the printed application form."
      : "Your fee is pending. You can pay anytime from the dashboard.";
    const p = PAYSTATUS[ps] || PAYSTATUS.unpaid;
    $("#donePay").innerHTML = '<p style="margin-bottom:16px"><span class="status-badge ' + p.cls + '">' + p.label + '</span>' +
      (app.paymentRef ? ' <span class="muted" style="font-size:13px">Ref: ' + esc(app.paymentRef) + '</span>' : "") + '</p>';
    $("[data-print-receipt]", $('[data-view="done"]')).hidden = ps !== "paid";
    const msg = "M.S.I. Inter College, Gorakhpur\nRegistration ID: " + app.regId + "\nStudent: " + app.studentName + "\nClass: " + app.applyClass + (app.stream ? " (" + app.stream + ")" : "");
    $("#waShare").href = "https://wa.me/?text=" + encodeURIComponent(msg);
    history.replaceState(null, "", "#done");
    show("done");
  }
  $('[data-view="done"]').addEventListener("click", e => {
    if (!doneApp) return;
    if (e.target.closest("[data-print-form]")) printForm(doneApp);
    if (e.target.closest("[data-print-receipt]")) printReceipt(doneApp);
  });

  /* ---------- Printing ---------- */
  const GOV_HEAD =
    "<div class='r-head'><img src='images/up_emblem.svg' width='62' height='62' alt=''>" +
    "<div class='r-title'><div class='r-gov'>Government of Uttar Pradesh</div>" +
    "<h2>मियाँ साहब इस्लामिया इण्टर कॉलेज</h2><div class='r-en'>M.S.I. INTER COLLEGE, BAKSHIPUR, GORAKHPUR (U.P.) – 273001</div>" +
    "<div class='r-small'>Govt. Aided Minority Institution · Affiliated to BHSIEUP, Prayagraj · UDISE+ 09580213904</div></div>" +
    "<img src='images/upboard_official.png' width='62' height='62' alt=''></div>";
  function doPrint(html) {
    const area = $("#printArea"); area.innerHTML = html;
    const imgs = $$("img", area).filter(i => !i.complete);
    Promise.all(imgs.map(i => new Promise(r => { i.onload = i.onerror = r; }))).then(() => window.print());
  }
  function printForm(app) {
    const a = flat(app), photo = app.photoUrl;
    const rows = LABELS.filter(([k]) => a[k]).map(([k, l]) => "<tr><td class='k'>" + l + "</td><td>" + esc(k === "dob" ? fmtDate(a[k]) : k === "aadhaar" ? maskAadhaar(a[k]) : a[k]) + "</td></tr>").join("");
    const p = PAYSTATUS[app.paymentStatus || "unpaid"] || PAYSTATUS.unpaid;
    doPrint(GOV_HEAD +
      "<div class='r-doc-title'>ADMISSION APPLICATION FORM — SESSION " + esc(app.session) + "</div>" +
      "<div class='r-meta'><div><b>Registration ID:</b> <span class='r-mono'>" + esc(app.regId) + "</span><br><b>Date of application:</b> " + fmtDate(app.createdAt) +
      "<br><b>Fee status:</b> " + p.label + (app.paymentRef ? " (Ref " + esc(app.paymentRef) + ")" : "") + "</div>" +
      "<div class='r-photo'>" + (photo ? "<img src='" + esc(photo) + "' alt=''>" : "Affix photo") + "</div></div>" +
      "<table>" + rows + "</table>" +
      "<p class='r-decl'><b>Declaration:</b> I declare that the information given above is true to the best of my knowledge. I shall abide by the rules of the institution. Admission is subject to verification of original documents.</p>" +
      "<div class='r-foot'><span>Signature of student</span><span>Signature of parent / guardian</span><span>Principal (signature &amp; seal)</span></div>" +
      "<div class='r-office'><b>For office use:</b> Documents verified ☐ &nbsp; Fee received ☐ &nbsp; Admission No. ____________ &nbsp; Section ______</div>");
  }
  function printReceipt(a) {
    const f = Object.assign({ admission: 0, tuition: 0, lab: 0, library: 0 }, a.feeBreakup || {});
    const row = (l, v) => v ? "<tr><td>" + l + "</td><td style='text-align:right'>" + rupee(v) + "</td></tr>" : "";
    doPrint(GOV_HEAD +
      "<div class='r-doc-title'>FEE RECEIPT</div>" +
      "<div class='r-meta'><div><b>Receipt / Txn ref.:</b> <span class='r-mono'>" + esc(a.paymentRef || "") + "</span><br><b>Registration ID:</b> " + esc(a.regId) +
      "<br><b>Date:</b> " + fmtDateTime(a.paidAt) + "</div><div class='r-paid'>PAID</div></div>" +
      "<table><tr><td class='k'>Student</td><td>" + esc(a.studentName) + "</td></tr><tr><td class='k'>Father / Guardian</td><td>" + esc(a.fatherName) + "</td></tr>" +
      "<tr><td class='k'>Class</td><td>" + esc(a.applyClass) + (a.stream ? " — " + esc(a.stream) : "") + " · Session " + esc(a.session) + "</td></tr>" +
      "<tr><td class='k'>Payment method</td><td>" + esc(a.paymentMethod || "") + "</td></tr></table>" +
      "<table style='margin-top:14px'><tr><th style='text-align:left'>Particulars</th><th style='text-align:right'>Amount</th></tr>" +
      row("Admission fee", f.admission) + row("Tuition fee (first month)", f.tuition) + row("Lab / computer fee", f.lab) + row("Library &amp; sports fund", f.library) +
      "<tr><td><b>Total paid</b></td><td style='text-align:right'><b>" + rupee(a.feeTotal) + "</b></td></tr></table>" +
      "<p class='r-decl'>This is a computer-generated receipt for a payment recorded in the college's admission system and does not require a signature.</p>");
  }

  /* ---------- Dashboard ---------- */
  async function renderDashboard() {
    const u = MSI.auth.user; if (!u) return route();
    const av = $("#dashAvatar");
    av.innerHTML = u.photoURL ? '<img src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;border-radius:50%;object-fit:cover">' : esc((u.displayName || u.email || "?").charAt(0).toUpperCase());
    $("#dashName").textContent = u.displayName || u.email;
    $("#dashMeta").textContent = u.email;
    const box = $("#dashApps");
    box.innerHTML = '<div class="card empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div>';
    try { dashApps = (await MSI.api("apps.mine")).applications || []; }
    catch (e) { dashApps = []; box.innerHTML = '<div class="card"><div class="alert alert-error"><i class="fas fa-circle-xmark"></i><div>' + esc(e.message) + '</div></div></div>'; return; }
    if (!dashApps.length) {
      box.innerHTML = '<div class="card empty-state"><i class="fas fa-folder-open"></i><p style="margin-bottom:16px">No applications yet</p>' +
        (S().admissions_open === false ? '<p class="muted">Admissions are currently closed.</p>' : '<button class="btn" data-go="apply"><i class="fas fa-plus"></i> Start application</button>') + '</div>';
      return;
    }
    box.innerHTML = dashApps.map(a => appCard(a)).join("");
  }
  function appActions(a) {
    const ps = a.paymentStatus || "unpaid";
    return '<div class="app-actions">' +
      (["unpaid", "failed", "office", "pending"].includes(ps) && a.feeTotal > 0 ? '<button class="btn btn-sm btn-gold" data-act="pay" data-id="' + esc(a.regId) + '"><i class="fas fa-indian-rupee-sign"></i> Pay fee ' + rupee(a.feeTotal) + '</button>' : "") +
      '<button class="btn btn-sm btn-outline" data-act="form" data-id="' + esc(a.regId) + '"><i class="fas fa-print"></i> Application form</button>' +
      (ps === "paid" ? '<button class="btn btn-sm btn-outline" data-act="receipt" data-id="' + esc(a.regId) + '"><i class="fas fa-receipt"></i> Fee receipt</button>' : "") + '</div>';
  }
  function appCard(a, flatStyle) {
    const st = STATUS[a.status] || STATUS.submitted, ps = PAYSTATUS[a.paymentStatus || "unpaid"] || PAYSTATUS.unpaid;
    return '<article class="card"' + (flatStyle ? ' style="box-shadow:none;background:var(--sand-50)"' : "") + '>' +
      '<div class="dash-head"><div class="dash-user">' +
      (a.photoUrl ? '<img class="app-photo" src="' + esc(a.photoUrl) + '" alt="">' : "") +
      '<div><small class="muted-label">Registration ID</small><div class="reg-id-inline">' + esc(a.regId) + '</div></div></div>' +
      '<div class="badges"><span class="status-badge ' + st.cls + '">' + st.label + '</span><span class="status-badge ' + ps.cls + '">' + ps.label + '</span></div></div>' +
      '<div class="dash-grid" style="margin-top:22px"><div class="kv">' +
      kv("Student", a.studentName) + kv("Class", a.applyClass + (a.stream ? " · " + a.stream : "")) +
      kv("Session", a.session) + kv("Submitted", fmtDate(a.createdAt)) + kv("Fee", rupee(a.feeTotal)) +
      (a.paymentRef ? kv("Payment ref.", a.paymentRef) : "") + (a.paymentMethod ? kv("Paid via", a.paymentMethod) : "") +
      '</div>' + tracker(a) + '</div>' + (flatStyle ? "" : appActions(a)) + '</article>';
  }
  const kv = (k, v) => "<div><small>" + k + "</small><strong>" + esc(v || "—") + "</strong></div>";
  function tracker(a) {
    const s = a.status, ps = a.paymentStatus || "unpaid", hist = a.history || [];
    const when = st => { const h = hist.filter(x => x.status === st).pop(); return h ? fmtDate(h.at) : ""; };
    const note = (hist.filter(h => h.note && !/^Application received|^Online payment started/.test(h.note)).pop() || {}).note;
    const items = [
      { t: "Application submitted", h: "Received", cls: "done", icon: "fa-paper-plane", d: fmtDate(a.createdAt) },
      { t: "Fee payment", h: ({ unpaid: "Pending", pending: "Processing", office: "Pay at office", paid: "Paid", failed: "Failed" })[ps] || "",
        cls: ps === "paid" ? "done" : ps === "failed" ? "rejected" : "current", icon: "fa-indian-rupee-sign", d: a.paidAt ? fmtDate(a.paidAt) : "" },
      { t: "Document verification", h: "At the college office", cls: s === "review" ? "current" : (s === "approved" || s === "rejected") ? "done" : "", icon: "fa-file-circle-check", d: when("review") },
      s === "rejected" ? { t: "Not approved", h: "Please contact the office", cls: "rejected", icon: "fa-xmark", d: when("rejected") }
                       : { t: "Admission approved", h: "Seat confirmed", cls: s === "approved" ? "done" : "", icon: "fa-graduation-cap", d: when("approved") }
    ];
    return '<div class="status-track">' + items.map(it =>
      '<div class="track-item ' + it.cls + '"><span class="track-dot"><i class="fas ' + it.icon + '"></i></span><div><strong>' + it.t + '</strong><span>' + it.h + (it.d ? " · " + it.d : "") + '</span></div></div>').join("") +
      (note ? '<div class="alert alert-info" style="margin-top:14px"><i class="fas fa-comment"></i><div><strong>Latest update:</strong> ' + esc(note) + '</div></div>' : "") + '</div>';
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = dashApps.find(x => x.regId === b.dataset.id); if (!a) return;
    if (b.dataset.act === "pay") openPayment(a);
    if (b.dataset.act === "form") printForm(a);
    if (b.dataset.act === "receipt") printReceipt(a);
  });

  /* ---------- Track ---------- */
  $("#trackForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target; if (!validateFields(f)) return;
    const btn = f.querySelector("[type=submit]"); busy(btn, true, "Checking…");
    const out = $("#trackResult");
    try {
      const r = await MSI.api("public.track", Object.fromEntries(new FormData(f)), { anonymous: true });
      out.innerHTML = r.application ? appCard(r.application, true)
        : '<div class="alert alert-error"><i class="fas fa-circle-xmark"></i><div>No application found for this Registration ID and mobile number. Please check and try again.</div></div>';
    } catch (err) { out.innerHTML = '<div class="alert alert-error"><i class="fas fa-circle-xmark"></i><div>' + esc(err.message) + '</div></div>'; }
    finally { busy(btn, false); }
  });

  route();
})();
