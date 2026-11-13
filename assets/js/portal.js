/* ==========================================================================
   Student portal: accounts, 5-step registration with uploads, fee payment,
   printable application form & receipt, dashboard, tracking.
   ========================================================================== */
(function () {
  "use strict";
  const CFG = window.MSI_CONFIG || {};
  const PAYCFG = CFG.PAYMENT || {};
  const S = window.MSIStore;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
  const fmtDateTime = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN");

  const STATUS = {
    submitted: { label: "Submitted · जमा", cls: "status-submitted" },
    review:    { label: "Under review · जाँच में", cls: "status-review" },
    approved:  { label: "Approved · स्वीकृत", cls: "status-approved" },
    rejected:  { label: "Not approved · अस्वीकृत", cls: "status-rejected" }
  };
  const PAYSTATUS = {
    unpaid:       { label: "Fee unpaid · शुल्क बकाया", cls: "status-rejected" },
    verification: { label: "Payment verifying · सत्यापन", cls: "status-review" },
    office:       { label: "Pay at office", cls: "status-submitted" },
    paid:         { label: "Fee paid · भुगतान सफल", cls: "status-approved" },
    failed:       { label: "Payment failed", cls: "status-rejected" }
  };

  /* ---------- Mode notice ---------- */
  if (S.mode === "local") {
    $("#modeNotice").innerHTML =
      '<div class="alert alert-warn" style="margin-bottom:16px"><i class="fas fa-triangle-exclamation"></i><div><strong>Demo mode:</strong> registrations and payments are saved only in this browser. ' +
      'Connect the Google Sheets backend (<code>backend/README.md</code>) before going live.</div></div>';
  }

  /* ---------- Views ---------- */
  const titles = {
    auth:      ["Online Registration", "ऑनलाइन प्रवेश पंजीकरण — create an account, fill the form, pay the fee and get your Registration ID instantly."],
    dashboard: ["Student Dashboard", "आपके आवेदन — applications, fee payment and status."],
    apply:     ["Admission Form", "प्रवेश आवेदन पत्र — session " + CFG.SESSION + "."],
    payment:   ["Fee Payment", "शुल्क भुगतान — pay securely online, by UPI, or at the college office."],
    done:      ["Registration Complete", "पंजीकरण सफल — print your application form and keep your Registration ID safe."],
    track:     ["Track Application", "आवेदन स्थिति — no login needed."]
  };
  function show(view) {
    $$("[data-view]").forEach(v => { v.hidden = v.dataset.view !== view; });
    $("#portalTitle").textContent = titles[view][0];
    $("#portalSub").textContent = titles[view][1];
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "dashboard") renderDashboard();
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-go]"); if (!b) return;
    const v = b.dataset.go;
    if (v === "apply") resetWizard();
    if (v === "dashboard" && !S.currentUser()) { history.replaceState(null, "", "#login"); return route(); }
    history.replaceState(null, "", "#" + v);
    show(v);
  });

  function route() {
    const h = location.hash.replace("#", "");
    const user = S.currentUser();
    if (h === "track") return show("track");
    if (user) {
      if (h === "apply") { resetWizard(); return show("apply"); }
      return show("dashboard");
    }
    show("auth");
    setAuthTab(h === "login" ? "login" : "signup");
  }
  window.addEventListener("hashchange", route);

  /* ---------- Helpers ---------- */
  function busy(btn, on, text) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (text || "Please wait…"); btn.disabled = true; }
    else if (btn.dataset.html) { btn.innerHTML = btn.dataset.html; btn.disabled = false; }
  }

  /* ---------- Auth ---------- */
  function setAuthTab(tab) {
    $$("[data-auth-tab]").forEach(t => t.classList.toggle("active", t.dataset.authTab === tab));
    $$("[data-auth-panel]").forEach(p => { p.hidden = p.dataset.authPanel !== tab; });
  }
  $$("[data-auth-tab]").forEach(t => t.addEventListener("click", () => setAuthTab(t.dataset.authTab)));
  $$(".pw-toggle").forEach(b => b.addEventListener("click", () => {
    const inp = b.parentElement.querySelector("input"), showPw = inp.type === "password";
    inp.type = showPw ? "text" : "password";
    b.innerHTML = '<i class="fas ' + (showPw ? "fa-eye-slash" : "fa-eye") + '"></i>';
    b.setAttribute("aria-label", showPw ? "Hide password" : "Show password");
  }));

  $("#signupForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, p2 = $("#suPass2");
    p2.setCustomValidity(p2.value && p2.value !== $("#suPass").value ? "mismatch" : "");
    if (!validateFields(f)) return;
    if (!$("#suAgree").checked) return toast("Please accept the declaration to continue.", "error");
    const btn = f.querySelector("[type=submit]"); busy(btn, true);
    try {
      const u = await S.signUp(Object.fromEntries(new FormData(f)));
      toast("खाता बन गया! Welcome, " + u.name.split(" ")[0] + ".");
      f.reset();
      resetWizard(); history.replaceState(null, "", "#apply"); show("apply");
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
      f.reset(); history.replaceState(null, "", "#dashboard"); route();
    } catch (err) { toast(err.message, "error"); }
    finally { busy(btn, false); }
  });

  $("#logoutBtn").addEventListener("click", () => { S.signOut(); toast("Logged out."); history.replaceState(null, "", "#login"); route(); });

  /* ---------- File uploads (client-side compression) ---------- */
  const uploads = {};
  function readAsDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("Could not read file")); r.readAsDataURL(file); });
  }
  async function compressImage(file, maxDim, quality) {
    const url = await readAsDataURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Unsupported image")); i.src = url; });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  }
  async function processFile(file, kind) {
    if (file.type === "application/pdf") {
      if (file.size > 3 * 1024 * 1024) throw new Error("PDF too large — max 3 MB");
      return readAsDataURL(file);
    }
    if (!/^image\//.test(file.type)) throw new Error("Please choose an image (JPG/PNG) or PDF");
    return kind === "photo" ? compressImage(file, 480, 0.82) : compressImage(file, 1400, 0.72);
  }
  $$("[data-upload]").forEach(field => {
    const kind = field.dataset.upload;
    const input = field.querySelector("input[type=file]");
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const box = field.querySelector(".upload-box");
      box.classList.add("loading");
      try {
        uploads[kind] = await processFile(file, kind);
        field.classList.remove("invalid");
        box.classList.add("has-file");
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
  function clearUploads(kinds) {
    (kinds || Object.keys(uploads)).forEach(k => {
      delete uploads[k];
      const f = $('[data-upload="' + k + '"]'); if (!f) return;
      const box = f.querySelector(".upload-box"); box.classList.remove("has-file");
      const img = box.querySelector("img"); if (img) { img.hidden = true; img.removeAttribute("src"); }
      const done = box.querySelector(".upload-done"); if (done) done.hidden = true;
      box.querySelector(".upload-empty").hidden = false;
    });
  }

  /* ---------- Wizard ---------- */
  const form = $("#applyForm");
  const steps = $$(".form-step", form);
  const stepperItems = $$(".stepper-item");
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
    clearUploads(["photo", "marksheet", "aadhaarDoc", "tc", "birthCert"]);
    toggleStream();
    const u = S.currentUser();
    if (u) { $("#phone").value = u.phone || ""; $("#email").value = u.email || ""; }
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

  const classGroup = () => S.CLASS_GROUP[$("#applyClass").value] || "";
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
      if (!uploads[f.dataset.upload]) { f.classList.add("invalid"); if (ok) { f.scrollIntoView({ behavior: "smooth", block: "center" }); } ok = false; }
    });
    return ok;
  }

  prevBtn.addEventListener("click", () => cur > 1 && go(cur - 1));
  nextBtn.addEventListener("click", async () => {
    if (cur < steps.length) { if (validateStep(cur)) go(cur + 1); return; }
    if (!$("#declare").checked) return toast("कृपया घोषणा स्वीकार करें · Please accept the declaration.", "error");
    busy(nextBtn, true, "Submitting…");
    try {
      const files = {};
      ["photo", "marksheet", "aadhaarDoc", "tc", "birthCert"].forEach(k => { if (uploads[k]) files[k] = uploads[k]; });
      const app = await S.submitApplication(collect(), files);
      toast("Application submitted · Registration ID " + app.regId);
      openPayment(app);
    } catch (err) { toast("Could not submit: " + err.message, "error"); }
    finally { busy(nextBtn, false); }
  });

  function collect() {
    const d = Object.fromEntries(new FormData(form));
    d.hostel = d.hostel ? "Yes" : "No";
    d.transport = d.transport ? "Yes" : "No";
    d.stream = d.stream || "";
    Object.keys(d).forEach(k => { if (typeof d[k] === "string") d[k] = d[k].trim(); });
    return d;
  }

  const LABELS = [
    ["studentName", "Student name · छात्र का नाम"], ["gender", "Gender · लिंग"], ["dob", "Date of birth · जन्म तिथि"],
    ["category", "Category · वर्ग"], ["religion", "Religion · धर्म"], ["nationality", "Nationality · राष्ट्रीयता"], ["bloodGroup", "Blood group"],
    ["aadhaar", "Aadhaar No."], ["applyClass", "Class · कक्षा"], ["stream", "Stream · संकाय"], ["medium", "Medium · माध्यम"],
    ["fatherName", "Father / Guardian · पिता"], ["motherName", "Mother · माता"], ["guardianOccupation", "Occupation · व्यवसाय"],
    ["annualIncome", "Annual income · वार्षिक आय"], ["phone", "Mobile · मोबाइल"], ["altPhone", "Alt. mobile"], ["email", "Email"],
    ["address", "Address · पता"], ["city", "City / District · जनपद"], ["pincode", "PIN"],
    ["prevSchool", "Previous school · पूर्व विद्यालय"], ["prevBoard", "Previous board"], ["prevClass", "Last class passed"], ["prevPercent", "Percentage · प्रतिशत"],
    ["hostel", "Hostel · छात्रावास"], ["transport", "Transport · परिवहन"]
  ];
  const maskAadhaar = v => v ? "XXXX XXXX " + String(v).slice(-4) : "";

  function feeBoxHtml(cls) {
    const f = S.feeBreakup(cls);
    return '<div style="font-weight:700;color:var(--emerald-900);margin-bottom:8px"><i class="fas fa-indian-rupee-sign"></i> Fee at registration · पंजीकरण शुल्क</div>' +
      '<div class="fee-row"><span>Admission fee · प्रवेश शुल्क</span><span>' + rupee(f.admission) + '</span></div>' +
      '<div class="fee-row"><span>Tuition (first month) · शिक्षण शुल्क</span><span>' + rupee(f.tuition) + '</span></div>' +
      (f.lab ? '<div class="fee-row"><span>Lab / computer fee · प्रयोगशाला शुल्क</span><span>' + rupee(f.lab) + '</span></div>' : "") +
      '<div class="fee-row"><span>Library &amp; sports fund · पुस्तकालय व खेलकूद</span><span>' + rupee(f.library) + '</span></div>' +
      '<div class="fee-row total"><span>Total payable · कुल देय</span><span>' + rupee(f.total) + '</span></div>';
  }

  function renderReview() {
    const d = collect();
    $("#reviewGrid").innerHTML =
      (uploads.photo ? '<div class="review-photo"><img src="' + uploads.photo + '" alt="Student photo"></div>' : "") +
      LABELS.filter(([k]) => d[k]).map(([k, l]) => "<div><small>" + l + "</small><strong>" + esc(k === "dob" ? fmtDate(d[k]) : k === "aadhaar" ? maskAadhaar(d[k]) : d[k]) + "</strong></div>").join("") +
      '<div><small>Documents uploaded</small><strong>' + (["marksheet", "aadhaarDoc", "tc", "birthCert"].filter(k => uploads[k]).length) + ' of 4</strong></div>';
    $("#feeBox").innerHTML = feeBoxHtml(d.applyClass);
  }

  /* ---------- Payment ---------- */
  let payApp = null;
  function openPayment(app) {
    payApp = app;
    if (app.paymentStatus === "paid" || !(app.feeTotal > 0)) return showDone(app);
    $("#payRegId").textContent = app.regId;
    $("#payStudent").textContent = app.studentName + " · " + app.applyClass + (app.stream ? " (" + app.stream + ")" : "");
    $("#payAmount").textContent = rupee(app.feeTotal);
    $("#payFeeBox").innerHTML = feeBoxHtml(app.applyClass);
    const opt = S.paymentOptions();
    $$(".pay-method").forEach(b => { b.hidden = !opt[b.dataset.method]; b.classList.remove("active"); });
    $$("[data-pay-panel]").forEach(p => p.hidden = true);
    $("#utr").value = ""; clearUploads(["upiProof"]);
    history.replaceState(null, "", "#payment");
    show("payment");
  }

  $("#payMethods").addEventListener("click", async e => {
    const b = e.target.closest(".pay-method"); if (!b || !payApp) return;
    const m = b.dataset.method;
    $$(".pay-method").forEach(x => x.classList.toggle("active", x === b));
    $$("[data-pay-panel]").forEach(p => p.hidden = p.dataset.payPanel !== m);
    try {
      if (m === "razorpay") {
        busy(b, true, "Opening secure payment…");
        const app = await S.payOnline(payApp);
        busy(b, false); toast("भुगतान सफल · Payment successful"); showDone(app);
      } else if (m === "upi") {
        renderUpi(payApp);
      } else if (m === "office") {
        if (!confirm("Pay " + rupee(payApp.feeTotal) + " at the college office? Your seat is confirmed only after the fee is paid.")) return;
        busy(b, true); const app = await S.payAtOffice(payApp); busy(b, false); showDone(app);
      } else if (m === "demo") {
        busy(b, true, "Processing test payment…");
        await new Promise(r => setTimeout(r, 900));
        const app = await S.payDemo(payApp); busy(b, false); showDone(app);
      }
    } catch (err) { busy(b, false); toast(err.message, "error"); }
  });

  function loadQrLib() {
    if (window.QRCode) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      s.onload = res; s.onerror = () => rej(new Error("Could not load QR generator"));
      document.head.appendChild(s);
    });
  }
  async function renderUpi(app) {
    const vpa = PAYCFG.UPI_ID, name = PAYCFG.UPI_PAYEE_NAME || "MSI INTER COLLEGE";
    const link = "upi://pay?pa=" + String(vpa).replace(/[^A-Za-z0-9.@_-]/g, "") + "&pn=" + encodeURIComponent(name) + "&am=" + Number(app.feeTotal).toFixed(2) +
                 "&cu=INR&tn=" + encodeURIComponent("Fee " + app.regId);
    $("#upiId").textContent = vpa; $("#upiName").textContent = name; $("#upiAmt").textContent = rupee(app.feeTotal);
    $("#upiIntent").href = link;
    const box = $("#upiQr"); box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try { await loadQrLib(); box.innerHTML = ""; new window.QRCode(box, { text: link, width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.M }); }
    catch (e) { box.innerHTML = '<p class="muted" style="font-size:13px">' + esc(e.message) + '</p>'; }
    $('[data-pay-panel="upi"]').scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("#upiForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!validateFields(e.target) || !payApp) return;
    const btn = e.target.querySelector("[type=submit]"); busy(btn, true, "Submitting…");
    try { const app = await S.payUpi(payApp, $("#utr").value, uploads.upiProof); toast("UTR submitted — the office will verify it shortly."); showDone(app); }
    catch (err) { toast(err.message, "error"); }
    finally { busy(btn, false); }
  });

  /* ---------- Done ---------- */
  let doneApp = null;
  function showDone(app) {
    doneApp = app;
    const ps = app.paymentStatus || "unpaid";
    $("#doneId").textContent = app.regId;
    const icon = $("#doneIcon");
    icon.className = "success-icon" + (ps === "paid" ? "" : " pending");
    icon.innerHTML = '<i class="fas ' + (ps === "paid" ? "fa-check" : "fa-hourglass-half") + '"></i>';
    $("#doneTitle").textContent = ps === "paid" ? "Registration & payment complete!" : "Registration submitted!";
    $("#doneText").textContent = ps === "paid"
      ? "पंजीकरण एवं शुल्क भुगतान सफल। Print your application form and fee receipt and bring them with original documents."
      : ps === "verification" ? "Your UPI payment is being verified by the college office (usually within 1 working day)."
      : ps === "office" ? "Please pay " + rupee(app.feeTotal) + " at the college fee counter (Mon–Sat, 8 AM – 4 PM) with the printed form."
      : "Your fee is pending. You can pay anytime from the dashboard.";
    const p = PAYSTATUS[ps] || PAYSTATUS.unpaid;
    $("#donePay").innerHTML = '<p style="margin-bottom:16px"><span class="status-badge ' + p.cls + '">' + p.label + '</span>' +
      (app.paymentRef ? ' <span class="muted" style="font-size:13px">Ref: ' + esc(app.paymentRef) + '</span>' : "") + '</p>';
    $("[data-print-receipt]", $('[data-view="done"]')).hidden = ps !== "paid";
    const msg = "M.S.I. Inter College, Gorakhpur\nRegistration ID: " + app.regId + "\nStudent: " + app.studentName + "\nClass: " + app.applyClass + (app.stream ? " (" + app.stream + ")" : "") + "\nFee: " + p.label.split(" · ")[0];
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
    "<div class='r-title'><div class='r-gov'>उत्तर प्रदेश सरकार · Government of Uttar Pradesh</div>" +
    "<h2>मियाँ साहब इस्लामिया इण्टर कॉलेज</h2><div class='r-en'>M.S.I. INTER COLLEGE, BAKSHIPUR, GORAKHPUR (U.P.) – 273001</div>" +
    "<div class='r-small'>Govt. Aided Minority Institution · Affiliated to BHSIEUP, Prayagraj · UDISE+ 09580213904</div></div>" +
    "<img src='images/upboard_official.png' width='62' height='62' alt=''></div>";

  function doPrint(html) {
    const area = $("#printArea");
    area.innerHTML = html;
    const imgs = $$("img", area).filter(i => !i.complete);
    Promise.all(imgs.map(i => new Promise(r => { i.onload = i.onerror = r; }))).then(() => window.print());
  }

  function printForm(a) {
    const photo = a.files && a.files.photo;
    const rows = LABELS.filter(([k]) => a[k]).map(([k, l]) => "<tr><td class='k'>" + l + "</td><td>" + esc(k === "dob" ? fmtDate(a[k]) : k === "aadhaar" ? maskAadhaar(a[k]) : a[k]) + "</td></tr>").join("");
    const p = PAYSTATUS[a.paymentStatus || "unpaid"];
    doPrint(GOV_HEAD +
      "<div class='r-doc-title'>प्रवेश आवेदन पत्र · ADMISSION APPLICATION FORM — SESSION " + esc(a.session || CFG.SESSION) + "</div>" +
      "<div class='r-meta'><div><b>Registration ID:</b> <span class='r-mono'>" + esc(a.regId) + "</span><br><b>Date of application:</b> " + fmtDate(a.createdAt) +
      "<br><b>Fee status:</b> " + p.label + (a.paymentRef ? " (Ref " + esc(a.paymentRef) + ")" : "") + "</div>" +
      "<div class='r-photo'>" + (photo ? "<img src='" + photo + "' alt=''>" : "Affix photo") + "</div></div>" +
      "<table>" + rows + "</table>" +
      "<p class='r-decl'><b>घोषणा / Declaration:</b> I declare that the information given above is true to the best of my knowledge. I shall abide by the rules of the institution. Admission is subject to verification of original documents.</p>" +
      "<div class='r-foot'><span>Signature of student</span><span>Signature of parent / guardian</span><span>Principal (signature &amp; seal)</span></div>" +
      "<div class='r-office'><b>For office use:</b> Documents verified ☐ &nbsp; Fee received ☐ &nbsp; Admission No. ____________ &nbsp; Section ______</div>");
  }

  function printReceipt(a) {
    const f = S.feeBreakup(a.applyClass);
    doPrint(GOV_HEAD +
      "<div class='r-doc-title'>शुल्क रसीद · FEE RECEIPT</div>" +
      "<div class='r-meta'><div><b>Receipt No.:</b> <span class='r-mono'>R-" + esc(a.regId) + "</span><br><b>Registration ID:</b> " + esc(a.regId) +
      "<br><b>Date:</b> " + fmtDateTime(a.paymentAt) + "</div><div class='r-paid'>PAID</div></div>" +
      "<table><tr><td class='k'>Student</td><td>" + esc(a.studentName) + "</td></tr><tr><td class='k'>Father / Guardian</td><td>" + esc(a.fatherName) + "</td></tr>" +
      "<tr><td class='k'>Class</td><td>" + esc(a.applyClass) + (a.stream ? " — " + esc(a.stream) : "") + " · Session " + esc(a.session || CFG.SESSION) + "</td></tr>" +
      "<tr><td class='k'>Payment method</td><td>" + esc(a.paymentMethod || "") + "</td></tr><tr><td class='k'>Transaction ref.</td><td class='r-mono'>" + esc(a.paymentRef || "") + "</td></tr></table>" +
      "<table style='margin-top:14px'><tr><th style='text-align:left'>Particulars</th><th style='text-align:right'>Amount</th></tr>" +
      "<tr><td>Admission fee</td><td style='text-align:right'>" + rupee(f.admission) + "</td></tr>" +
      "<tr><td>Tuition fee (first month)</td><td style='text-align:right'>" + rupee(f.tuition) + "</td></tr>" +
      (f.lab ? "<tr><td>Lab / computer fee</td><td style='text-align:right'>" + rupee(f.lab) + "</td></tr>" : "") +
      "<tr><td>Library &amp; sports fund</td><td style='text-align:right'>" + rupee(f.library) + "</td></tr>" +
      "<tr><td><b>Total paid</b></td><td style='text-align:right'><b>" + rupee(a.feeTotal || f.total) + "</b></td></tr></table>" +
      "<p class='r-decl'>This is a computer-generated receipt for an online payment and does not require a signature.</p>");
  }

  /* ---------- Dashboard ---------- */
  let dashApps = [];
  async function renderDashboard() {
    const u = S.currentUser();
    if (!u) return route();
    $("#dashAvatar").textContent = (u.name || "?").trim().charAt(0).toUpperCase();
    $("#dashName").textContent = u.name;
    $("#dashMeta").textContent = u.email + " · " + u.phone;
    const box = $("#dashApps");
    box.innerHTML = '<div class="card empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div>';
    try { dashApps = await S.myApplications(); }
    catch (e) { dashApps = []; toast(e.message, "error"); if (/log in again/i.test(e.message)) { S.signOut(); return route(); } }
    if (!dashApps.length) {
      box.innerHTML = '<div class="card empty-state"><i class="fas fa-folder-open"></i><p style="margin-bottom:16px">No applications yet · अभी कोई आवेदन नहीं</p><button class="btn" data-go="apply"><i class="fas fa-plus"></i> Start application</button></div>';
      return;
    }
    box.innerHTML = dashApps.map(a => appCard(a)).join("");
  }

  function appActions(a) {
    const ps = a.paymentStatus || "unpaid";
    return '<div class="app-actions">' +
      (ps === "unpaid" || ps === "failed" || ps === "office" ? '<button class="btn btn-sm btn-gold" data-act="pay" data-id="' + esc(a.regId) + '"><i class="fas fa-indian-rupee-sign"></i> Pay fee ' + rupee(a.feeTotal) + '</button>' : "") +
      '<button class="btn btn-sm btn-outline" data-act="form" data-id="' + esc(a.regId) + '"><i class="fas fa-print"></i> Application form</button>' +
      (ps === "paid" ? '<button class="btn btn-sm btn-outline" data-act="receipt" data-id="' + esc(a.regId) + '"><i class="fas fa-receipt"></i> Fee receipt</button>' : "") +
      '</div>';
  }
  function appCard(a, flat) {
    const st = STATUS[a.status] || STATUS.submitted, ps = PAYSTATUS[a.paymentStatus || "unpaid"];
    const photo = a.files && a.files.photo;
    return '<article class="card"' + (flat ? ' style="box-shadow:none;background:var(--sand-50)"' : "") + '>' +
      '<div class="dash-head"><div class="dash-user">' +
      (photo ? '<img class="app-photo" src="' + photo + '" alt="">' : "") +
      '<div><small class="muted-label">Registration ID</small><div class="reg-id-inline">' + esc(a.regId) + '</div></div></div>' +
      '<div class="badges"><span class="status-badge ' + st.cls + '">' + st.label + '</span><span class="status-badge ' + ps.cls + '">' + ps.label + '</span></div></div>' +
      '<div class="dash-grid" style="margin-top:22px"><div class="kv">' +
      kv("Student", a.studentName) + kv("Class", a.applyClass + (a.stream ? " · " + a.stream : "")) +
      kv("Medium", a.medium) + kv("Session", a.session) + kv("Submitted", fmtDate(a.createdAt)) + kv("Fee", rupee(a.feeTotal)) +
      (a.paymentRef ? kv("Payment ref.", a.paymentRef) : "") + (a.paymentMethod ? kv("Paid via", a.paymentMethod) : "") +
      '</div>' + tracker(a) + '</div>' + appActions(a) + '</article>';
  }
  const kv = (k, v) => "<div><small>" + k + "</small><strong>" + esc(v || "—") + "</strong></div>";

  function tracker(a) {
    const s = a.status, ps = a.paymentStatus || "unpaid", hist = a.history || [];
    const when = st => { const h = hist.filter(x => x.status === st).pop(); return h ? fmtDate(h.at) : ""; };
    const note = (hist.filter(h => h.note && !/^Application received/.test(h.note)).pop() || {}).note;
    const items = [
      { t: "Application submitted", h: "आवेदन जमा", cls: "done", icon: "fa-paper-plane", d: when("submitted") },
      { t: "Fee payment", h: ps === "paid" ? "भुगतान सफल" : ps === "verification" ? "सत्यापन जारी" : ps === "office" ? "कार्यालय में जमा करें" : "शुल्क बकाया",
        cls: ps === "paid" ? "done" : ps === "failed" ? "rejected" : "current", icon: "fa-indian-rupee-sign", d: a.paymentAt ? fmtDate(a.paymentAt) : "" },
      { t: "Document verification", h: "दस्तावेज़ जाँच", cls: s === "review" ? "current" : (s === "approved" || s === "rejected") ? "done" : "", icon: "fa-file-circle-check", d: when("review") },
      s === "rejected" ? { t: "Not approved", h: "अस्वीकृत", cls: "rejected", icon: "fa-xmark", d: when("rejected") }
                       : { t: "Admission approved", h: "प्रवेश स्वीकृत", cls: s === "approved" ? "done" : "", icon: "fa-graduation-cap", d: when("approved") }
    ];
    return '<div class="status-track">' + items.map(it =>
      '<div class="track-item ' + it.cls + '"><span class="track-dot"><i class="fas ' + it.icon + '"></i></span><div><strong>' + it.t + '</strong><span>' + it.h + (it.d ? " · " + it.d : "") + '</span></div></div>').join("") +
      (note ? '<div class="alert alert-info" style="margin-top:14px"><i class="fas fa-comment"></i><div><strong>Latest update:</strong> ' + esc(note) + '</div></div>' : "") + '</div>';
  }

  // Card buttons (dashboard + track)
  let trackApp = null;
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = dashApps.concat(trackApp ? [trackApp] : []).find(x => x.regId === b.dataset.id); if (!a) return;
    if (b.dataset.act === "pay") openPayment(a);
    if (b.dataset.act === "form") printForm(a);
    if (b.dataset.act === "receipt") printReceipt(a);
  });

  /* ---------- Track ---------- */
  $("#trackForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target;
    if (!validateFields(f)) return;
    const btn = f.querySelector("[type=submit]"); busy(btn, true, "Checking…");
    const out = $("#trackResult");
    try {
      const d = Object.fromEntries(new FormData(f));
      trackApp = await S.findApplication(d.regId, d.phone);
      out.innerHTML = trackApp ? appCard(trackApp, true)
        : '<div class="alert alert-error"><i class="fas fa-circle-xmark"></i><div>No application found for this Registration ID and mobile number. ' +
          (S.mode === "local" ? "In demo mode, applications are visible only on the device they were submitted from." : "Please check and try again.") + '</div></div>';
    } catch (err) { out.innerHTML = '<div class="alert alert-error"><i class="fas fa-circle-xmark"></i><div>' + esc(err.message) + '</div></div>'; }
    finally { busy(btn, false); }
  });

  // Hide payment-only info if nothing is configured
  const opts = S.paymentOptions();
  if (!opts.razorpay && !opts.upi && !opts.office && !opts.demo) titles.payment[1] = "Fee payment is not enabled — please pay at the college office.";

  route();
})();
