/* ==========================================================================
   Admissions admin panel
   ========================================================================== */
(function () {
  "use strict";
  const S = window.MSIStore;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = iso => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch (_) { return iso || ""; } };
  const STATUS = {
    submitted: ["New", "status-submitted"], review: ["Under review", "status-review"],
    approved: ["Approved", "status-approved"], rejected: ["Not approved", "status-rejected"]
  };
  const KEY = "msi.admin.session";
  let pass = null, apps = [], current = null;

  function sessGet() { try { return sessionStorage.getItem(KEY); } catch (_) { return null; } }
  function sessSet(v) { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch (_) {} }

  async function login(code) {
    await S.verifyAdmin(code).then(ok => { if (!ok) throw new Error("Incorrect passcode"); });
    pass = code; sessSet(code);
    $("#adminLogin").hidden = true; $("#adminPanel").hidden = false; $("#adminLogout").hidden = false;
    $("#adminMode").innerHTML = S.mode === "local"
      ? '<div class="alert alert-warn" style="margin-bottom:18px"><i class="fas fa-triangle-exclamation"></i><div><strong>Demo mode</strong> — showing registrations stored in this browser only. Connect the Google Sheets backend to receive applications from every visitor.</div></div>'
      : '<div class="alert alert-success" style="margin-bottom:18px"><i class="fas fa-cloud"></i><div>Connected to Google Sheets — showing all online registrations.</div></div>';
    load();
  }

  $("#adminLoginForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!validateFields(e.target)) return;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try { await login($("#adminPass").value); }
    catch (err) { toast(err.message === "Unauthorized" ? "Incorrect passcode" : err.message, "error"); }
    finally { btn.disabled = false; }
  });
  $("#adminLogout").addEventListener("click", () => { sessSet(null); location.reload(); });

  async function load() {
    $("#rows").innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></td></tr>';
    try { apps = await S.adminList(pass); }
    catch (err) { toast(err.message, "error"); apps = []; }
    const classes = Array.from(new Set(apps.map(a => a.applyClass).filter(Boolean)));
    const fc = $("#fClass"), keep = fc.value;
    fc.innerHTML = '<option value="">All classes</option>' + classes.map(c => "<option>" + esc(c) + "</option>").join("");
    fc.value = keep;
    stats(); render();
  }

  function stats() {
    const c = s => apps.filter(a => a.status === s).length;
    $("#stTotal").textContent = apps.length;
    $("#stNew").textContent = c("submitted");
    $("#stReview").textContent = c("review");
    $("#stApproved").textContent = c("approved");
  }

  function filtered() {
    const q = $("#q").value.trim().toLowerCase(), st = $("#fStatus").value, cl = $("#fClass").value;
    return apps.filter(a =>
      (!st || a.status === st) && (!cl || a.applyClass === cl) &&
      (!q || [a.regId, a.studentName, a.phone, a.fatherName, a.email].join(" ").toLowerCase().includes(q)));
  }

  function render() {
    const list = filtered();
    $("#rows").innerHTML = list.length ? list.map(a => {
      const s = STATUS[a.status] || STATUS.submitted;
      return "<tr><td class='mono'>" + esc(a.regId) + "</td><td><strong>" + esc(a.studentName) + "</strong><br><small style='color:var(--ink-500)'>" + esc(a.fatherName) + "</small></td>" +
        "<td>" + esc(a.applyClass) + (a.stream ? "<br><small style='color:var(--ink-500)'>" + esc(a.stream) + "</small>" : "") + "</td>" +
        "<td><a href='tel:" + esc(a.phone) + "'>" + esc(a.phone) + "</a></td><td>" + fmt(a.createdAt) + "</td>" +
        "<td><span class='status-badge " + s[1] + "'>" + s[0] + "</span></td>" +
        "<td><button class='btn btn-sm btn-outline' data-open='" + esc(a.regId) + "'>View</button></td></tr>";
    }).join("") : '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-inbox"></i><p>No registrations match.</p></div></td></tr>';
  }
  ["input", "change"].forEach(ev => { $("#q").addEventListener(ev, render); $("#fStatus").addEventListener(ev, render); $("#fClass").addEventListener(ev, render); });
  $("#refreshBtn").addEventListener("click", load);

  /* ---------- detail modal ---------- */
  const modal = $("#detailModal");
  const FIELDS = [
    ["regId", "Registration ID"], ["status", "Status"], ["studentName", "Student"], ["gender", "Gender"], ["dob", "Date of birth"],
    ["aadhaar", "Aadhaar"], ["category", "Category"], ["religion", "Religion"], ["applyClass", "Class"], ["stream", "Stream"], ["medium", "Medium"],
    ["fatherName", "Father / Guardian"], ["motherName", "Mother"], ["guardianOccupation", "Occupation"], ["phone", "Mobile"], ["altPhone", "Alt. mobile"],
    ["email", "Email"], ["address", "Address"], ["city", "City"], ["pincode", "PIN"], ["prevSchool", "Previous school"], ["prevBoard", "Previous board"],
    ["prevClass", "Last class"], ["prevPercent", "Percentage"], ["hostel", "Hostel"], ["transport", "Transport"], ["createdAt", "Submitted"]
  ];
  $("#rows").addEventListener("click", e => {
    const b = e.target.closest("[data-open]"); if (!b) return;
    current = apps.find(a => a.regId === b.dataset.open); if (!current) return;
    $("#dmTitle").textContent = current.studentName + " · " + current.regId;
    $("#dmBody").innerHTML = FIELDS.filter(([k]) => current[k]).map(([k, l]) =>
      "<div><small>" + l + "</small><strong>" + esc(k === "createdAt" ? fmt(current[k]) : k === "status" ? (STATUS[current[k]] || [current[k]])[0] : current[k]) + "</strong></div>").join("");
    $("#dmStatus").value = current.status || "submitted";
    $("#dmNote").value = "";
    $("#dmWa").href = "https://wa.me/91" + current.phone + "?text=" + encodeURIComponent("M.S.I. Inter College — regarding registration " + current.regId + " (" + current.studentName + "): ");
    modal.classList.add("open"); $("#dmStatus").focus();
  });
  const close = () => modal.classList.remove("open");
  $$("[data-close-modal]").forEach(b => b.addEventListener("click", close));
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  $("#dmSave").addEventListener("click", async () => {
    if (!current) return;
    try {
      await S.adminUpdate(pass, current.regId, $("#dmStatus").value, $("#dmNote").value.trim());
      toast("Status updated for " + current.regId);
      close(); load();
    } catch (err) { toast(err.message, "error"); }
  });
  $("#dmDelete").addEventListener("click", async () => {
    if (!current || !confirm("Delete registration " + current.regId + " permanently?")) return;
    try { await S.adminDelete(pass, current.regId); toast("Deleted " + current.regId); close(); load(); }
    catch (err) { toast(err.message, "error"); }
  });

  /* ---------- CSV export (opens in Excel; BOM keeps Hindi intact) ---------- */
  $("#exportBtn").addEventListener("click", () => {
    const list = filtered();
    if (!list.length) return toast("Nothing to export", "error");
    const cols = FIELDS.map(f => f[0]);
    const cell = v => { let s = String(v == null ? "" : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const csv = [FIELDS.map(f => cell(f[1])).join(",")].concat(list.map(a => cols.map(c => cell(a[c])).join(","))).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "msi-registrations-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  const saved = sessGet();
  if (saved) login(saved).catch(() => sessSet(null));
})();
