/* ==========================================================================
   Admissions admin panel — applications, documents, fee verification
   ========================================================================== */
(function () {
  "use strict";
  const S = window.MSIStore;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
  const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN");
  const STATUS = {
    submitted: ["New", "status-submitted"], review: ["Under review", "status-review"],
    approved: ["Approved", "status-approved"], rejected: ["Not approved", "status-rejected"]
  };
  const PAY = {
    unpaid: ["Unpaid", "status-rejected"], verification: ["UPI — verify", "status-review"], office: ["At office", "status-submitted"],
    paid: ["Paid", "status-approved"], failed: ["Failed", "status-rejected"]
  };
  const KEY = "msi.admin.session";
  let pass = null, apps = [], current = null;

  const sessGet = () => { try { return sessionStorage.getItem(KEY); } catch (_) { return null; } };
  const sessSet = v => { try { if (v) sessionStorage.setItem(KEY, v); else sessionStorage.clear(); } catch (_) {} };

  async function login(code) {
    const ok = await S.verifyAdmin(code);
    if (!ok) throw new Error("Incorrect passcode");
    pass = code; sessSet(code);
    $("#adminLogin").hidden = true; $("#adminPanel").hidden = false; $("#adminLogout").hidden = false;
    $("#adminMode").innerHTML = S.mode === "local"
      ? '<div class="alert alert-warn" style="margin-bottom:18px"><i class="fas fa-triangle-exclamation"></i><div><strong>Demo mode</strong> — showing registrations stored in this browser only. Connect the Google Sheets backend to receive applications and payments from every visitor.</div></div>'
      : '<div class="alert alert-success" style="margin-bottom:18px"><i class="fas fa-cloud"></i><div>Connected to Google Sheets — showing all online registrations.</div></div>';
    load();
  }

  $("#adminLoginForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!validateFields(e.target)) return;
    const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
    try { await login($("#adminPass").value); }
    catch (err) { toast(err.message === "Unauthorized" ? "Incorrect passcode" : err.message, "error"); }
    finally { btn.disabled = false; }
  });
  $("#adminLogout").addEventListener("click", () => { sessSet(null); location.reload(); });

  async function load() {
    $("#rows").innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div></td></tr>';
    try { apps = await S.adminList(pass); } catch (err) { toast(err.message, "error"); apps = []; }
    const classes = Array.from(new Set(apps.map(a => a.applyClass).filter(Boolean))).sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")));
    const fc = $("#fClass"), keep = fc.value;
    fc.innerHTML = '<option value="">All classes</option>' + classes.map(c => "<option>" + esc(c) + "</option>").join("");
    fc.value = keep;
    stats(); render();
  }

  function stats() {
    const c = (k, v) => apps.filter(a => (a[k] || (k === "paymentStatus" ? "unpaid" : "")) === v).length;
    $("#stTotal").textContent = apps.length;
    $("#stNew").textContent = c("status", "submitted");
    $("#stReview").textContent = c("status", "review");
    $("#stApproved").textContent = c("status", "approved");
    $("#stCollected").textContent = rupee(apps.filter(a => a.paymentStatus === "paid").reduce((s, a) => s + Number(a.feeTotal || 0), 0));
    $("#stPaid").textContent = c("paymentStatus", "paid");
    $("#stVerify").textContent = c("paymentStatus", "verification");
    $("#stUnpaid").textContent = c("paymentStatus", "unpaid") + c("paymentStatus", "office") + c("paymentStatus", "failed");
  }

  function filtered() {
    const q = $("#q").value.trim().toLowerCase(), st = $("#fStatus").value, cl = $("#fClass").value, fp = $("#fPay").value;
    return apps.filter(a =>
      (!st || a.status === st) && (!cl || a.applyClass === cl) && (!fp || (a.paymentStatus || "unpaid") === fp) &&
      (!q || [a.regId, a.studentName, a.phone, a.fatherName, a.email, a.paymentRef].join(" ").toLowerCase().includes(q)));
  }

  function render() {
    const list = filtered();
    $("#rows").innerHTML = list.length ? list.map(a => {
      const s = STATUS[a.status] || STATUS.submitted, p = PAY[a.paymentStatus || "unpaid"] || PAY.unpaid;
      return "<tr><td class='mono'>" + esc(a.regId) + "</td><td><strong>" + esc(a.studentName) + "</strong><br><small style='color:var(--ink-500)'>" + esc(a.fatherName) + "</small></td>" +
        "<td>" + esc(a.applyClass) + (a.stream ? "<br><small style='color:var(--ink-500)'>" + esc(a.stream) + "</small>" : "") + "</td>" +
        "<td><a href='tel:" + esc(a.phone) + "'>" + esc(a.phone) + "</a></td><td>" + fmt(a.createdAt) + "</td>" +
        "<td>" + rupee(a.feeTotal) + "<br><span class='status-badge " + p[1] + "' style='margin-top:4px'>" + p[0] + "</span></td>" +
        "<td><span class='status-badge " + s[1] + "'>" + s[0] + "</span></td>" +
        "<td><button class='btn btn-sm btn-outline' data-open='" + esc(a.regId) + "'>View</button></td></tr>";
    }).join("") : '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-inbox"></i><p>No registrations match.</p></div></td></tr>';
  }
  ["#q", "#fStatus", "#fClass", "#fPay"].forEach(id => ["input", "change"].forEach(ev => $(id).addEventListener(ev, render)));
  $("#refreshBtn").addEventListener("click", load);

  /* ---------- detail modal ---------- */
  const modal = $("#detailModal");
  const FIELDS = [
    ["regId", "Registration ID"], ["studentName", "Student"], ["gender", "Gender"], ["dob", "Date of birth"],
    ["aadhaar", "Aadhaar"], ["category", "Category"], ["religion", "Religion"], ["nationality", "Nationality"], ["bloodGroup", "Blood group"],
    ["applyClass", "Class"], ["stream", "Stream"], ["medium", "Medium"],
    ["fatherName", "Father / Guardian"], ["motherName", "Mother"], ["guardianOccupation", "Occupation"], ["annualIncome", "Annual income"],
    ["phone", "Mobile"], ["altPhone", "Alt. mobile"], ["email", "Email"], ["address", "Address"], ["city", "City"], ["pincode", "PIN"],
    ["prevSchool", "Previous school"], ["prevBoard", "Previous board"], ["prevClass", "Last class"], ["prevPercent", "Percentage"],
    ["hostel", "Hostel"], ["transport", "Transport"], ["createdAt", "Submitted"]
  ];
  const DOCS = [["marksheet", "marksheetUrl", "Mark sheet"], ["aadhaarDoc", "aadhaarDocUrl", "Aadhaar"], ["tc", "tcUrl", "T.C."], ["birthCert", "birthCertUrl", "Birth cert."]];

  function docHref(a, key, urlKey) {
    if (a[urlKey]) return a[urlKey];
    const d = a.files && a.files[key];
    return d || "";
  }
  function openDataUrl(dataUrl) {
    // data: URLs can't be opened directly in a new tab in most browsers — convert to a blob URL.
    const [meta, b64] = dataUrl.split(",");
    const bytes = atob(b64), arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: meta.slice(5, meta.indexOf(";")) }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  $("#rows").addEventListener("click", e => {
    const b = e.target.closest("[data-open]"); if (!b) return;
    current = apps.find(a => a.regId === b.dataset.open); if (!current) return;
    const a = current;
    $("#dmTitle").textContent = a.studentName + " · " + a.regId;
    const photo = (a.files && a.files.photo) || "";
    $("#dmPhoto").innerHTML = photo ? '<img class="admin-photo" src="' + photo + '" alt="Student photo">'
      : a.photoUrl ? '<a class="btn btn-sm btn-outline" href="' + esc(a.photoUrl) + '" target="_blank" rel="noopener"><i class="fas fa-user"></i> View photo</a>' : "";
    $("#dmBody").innerHTML = FIELDS.filter(([k]) => a[k]).map(([k, l]) =>
      "<div><small>" + l + "</small><strong>" + esc(k === "createdAt" ? fmt(a[k]) : a[k]) + "</strong></div>").join("");
    $("#dmDocs").innerHTML = DOCS.map(([k, u, l]) => {
      const h = docHref(a, k, u);
      return h ? '<a href="#" data-doc="' + k + '"><i class="fas fa-file"></i> ' + l + '</a>' : "";
    }).join("") || '<span class="muted" style="font-size:13px">No documents uploaded</span>';
    const p = PAY[a.paymentStatus || "unpaid"] || PAY.unpaid;
    $("#dmPayBox").innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><strong style="color:var(--emerald-900)"><i class="fas fa-indian-rupee-sign"></i> Fee ' + rupee(a.feeTotal) + '</strong>' +
      '<span class="status-badge ' + p[1] + '">' + p[0] + '</span></div>' +
      (a.paymentMethod ? '<div class="fee-row"><span>Method</span><span>' + esc(a.paymentMethod) + '</span></div>' : "") +
      (a.paymentRef ? '<div class="fee-row"><span>Reference / UTR</span><span class="mono">' + esc(a.paymentRef) + '</span></div>' : "") +
      (a.paymentAt ? '<div class="fee-row"><span>Date</span><span>' + fmt(a.paymentAt) + '</span></div>' : "") +
      (a.paymentProof ? '<div class="fee-row"><span>Screenshot</span><span><a href="#" data-proof style="color:var(--emerald-700);font-weight:600">View</a></span></div>' : "") +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
      (a.paymentStatus !== "paid" ? '<button class="btn btn-sm" data-pay="paid"><i class="fas fa-check"></i> Mark fee received</button>' : "") +
      (a.paymentStatus === "verification" ? '<button class="btn btn-sm btn-outline" data-pay="failed" style="color:var(--danger);border-color:var(--danger)"><i class="fas fa-xmark"></i> UTR not found</button>' : "") +
      (a.paymentStatus === "paid" ? '<button class="btn btn-sm btn-outline" data-pay="unpaid"><i class="fas fa-rotate-left"></i> Undo payment</button>' : "") +
      '</div>';
    $("#dmStatus").value = a.status || "submitted";
    $("#dmNote").value = "";
    $("#dmWa").href = "https://wa.me/91" + a.phone + "?text=" + encodeURIComponent("M.S.I. Inter College, Gorakhpur — regarding registration " + a.regId + " (" + a.studentName + "): ");
    modal.classList.add("open"); $("#dmStatus").focus();
  });

  modal.addEventListener("click", async e => {
    if (e.target === modal) return close();
    const d = e.target.closest("[data-doc]");
    if (d) {
      e.preventDefault();
      const [k, u] = DOCS.find(x => x[0] === d.dataset.doc);
      const h = docHref(current, k, u);
      if (h.startsWith("data:")) openDataUrl(h); else window.open(h, "_blank", "noopener");
      return;
    }
    if (e.target.closest("[data-proof]")) {
      e.preventDefault();
      const h = current.paymentProof;
      if (h.startsWith("data:")) openDataUrl(h); else window.open(h, "_blank", "noopener");
      return;
    }
    const pb = e.target.closest("[data-pay]");
    if (pb) {
      const st = pb.dataset.pay;
      const msg = st === "paid" ? "Confirm fee " + rupee(current.feeTotal) + " received for " + current.regId + "?" :
                  st === "failed" ? "Mark this UPI payment as not received? The parent will be asked to pay again." : "Undo the payment record?";
      if (!confirm(msg)) return;
      try {
        await S.adminPayment(pass, current.regId, st, st === "paid" ? "Fee received — verified by office" : st === "failed" ? "UPI payment not found — please pay again" : "Payment record reset by office");
        toast("Payment updated for " + current.regId); close(); load();
      } catch (err) { toast(err.message, "error"); }
    }
  });
  const close = () => modal.classList.remove("open");
  $$("[data-close-modal]").forEach(b => b.addEventListener("click", close));
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  $("#dmSave").addEventListener("click", async () => {
    if (!current) return;
    try {
      await S.adminUpdate(pass, current.regId, $("#dmStatus").value, $("#dmNote").value.trim());
      toast("Status updated for " + current.regId); close(); load();
    } catch (err) { toast(err.message, "error"); }
  });
  $("#dmDelete").addEventListener("click", async () => {
    if (!current || !confirm("Delete registration " + current.regId + " permanently?")) return;
    try { await S.adminDelete(pass, current.regId); toast("Deleted " + current.regId); close(); load(); }
    catch (err) { toast(err.message, "error"); }
  });

  /* ---------- password reset for parents ---------- */
  $("#resetPwBtn").addEventListener("click", async () => {
    const email = prompt("Parent's account email:"); if (!email) return;
    const pw = prompt("New temporary password (min 8 characters):"); if (!pw) return;
    if (pw.length < 8) return toast("Password must be at least 8 characters", "error");
    try { await S.adminResetPassword(pass, email, pw); toast("Password reset. Share it with the parent on call/WhatsApp."); }
    catch (err) { toast(err.message, "error"); }
  });

  /* ---------- CSV export ---------- */
  $("#exportBtn").addEventListener("click", () => {
    const list = filtered();
    if (!list.length) return toast("Nothing to export", "error");
    const cols = FIELDS.concat([["status", "Status"], ["feeTotal", "Fee"], ["paymentStatus", "Payment"], ["paymentMethod", "Method"], ["paymentRef", "Reference"], ["paymentAt", "Paid on"]]);
    const cell = v => { let s = String(v == null ? "" : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const csv = [cols.map(f => cell(f[1])).join(",")].concat(list.map(a => cols.map(([c]) => cell(a[c])).join(","))).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "msi-registrations-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  });

  const saved = sessGet();
  if (saved) login(saved).catch(() => sessSet(null));
})();
