/**
 * M.S.I. Inter College — Registration backend (Google Apps Script)
 * ------------------------------------------------------------------
 * Stores every online admission registration in a Google Sheet.
 *
 * SETUP (10 minutes, free):
 *  1. Create a new Google Sheet (e.g. "MSI Admissions").
 *  2. Extensions → Apps Script. Delete the sample code, paste this file.
 *  3. Change ADMIN_KEY below to a strong secret (same value goes into
 *     ADMIN_PASSCODE in assets/js/config.js).
 *  4. Deploy → New deployment → type "Web app"
 *       Execute as: Me
 *       Who has access: Anyone
 *  5. Copy the Web app URL into APPS_SCRIPT_URL in assets/js/config.js.
 *
 * After any change to this script, use Deploy → Manage deployments →
 * Edit → Version: New version, so the same URL serves the new code.
 */

const ADMIN_KEY = 'CHANGE-ME-to-a-long-secret';
const SHEET_NAME = 'Registrations';
const COLUMNS = [
  'regId', 'createdAt', 'updatedAt', 'status', 'session',
  'studentName', 'gender', 'dob', 'aadhaar', 'category', 'religion',
  'applyClass', 'stream', 'medium',
  'fatherName', 'motherName', 'guardianOccupation', 'phone', 'altPhone', 'email',
  'address', 'city', 'pincode',
  'prevSchool', 'prevBoard', 'prevClass', 'prevPercent',
  'hostel', 'transport', 'history'
];
const STATUSES = ['submitted', 'review', 'approved', 'rejected'];

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    switch (req.action) {
      case 'submit': return json(submit_(req.data || {}));
      case 'status': return json(status_(req.regId, req.phone));
      case 'list':   auth_(req.adminKey); return json({ ok: true, applications: list_(req.limit) });
      case 'update': auth_(req.adminKey); return json(update_(req.regId, req.status, req.note));
      case 'delete': auth_(req.adminKey); return json(remove_(req.regId));
      default:       return json({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  }
}

function doGet() {
  return json({ ok: true, service: 'MSI registrations', time: new Date().toISOString() });
}

/* ---------------- actions ---------------- */

function submit_(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    if (!d.studentName || !d.phone) throw new Error('Missing required fields');
    const phone = String(d.phone).replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) throw new Error('Invalid mobile number');
    // Rate-limit: max 5 applications per mobile number.
    const existing = rows_().filter(r => r.phone === phone).length;
    if (existing >= 5) throw new Error('Too many applications for this mobile number');

    let regId = String(d.regId || '');
    if (!/^MSI\d{2}-[A-Z0-9]{6}$/.test(regId) || rows_().some(r => r.regId === regId)) {
      regId = 'MSI' + String(new Date().getFullYear()).slice(-2) + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
    }
    const now = new Date().toISOString();
    const record = Object.assign({}, d, {
      regId, phone, status: 'submitted', createdAt: now, updatedAt: now,
      history: JSON.stringify([{ status: 'submitted', at: now, note: 'Application received online' }])
    });
    sh.appendRow(COLUMNS.map(c => clean_(record[c])));
    return { ok: true, regId };
  } finally {
    lock.releaseLock();
  }
}

function status_(regId, phone) {
  regId = String(regId || '').trim().toUpperCase();
  phone = String(phone || '').replace(/\D/g, '').slice(-10);
  const r = rows_().find(x => x.regId === regId && x.phone === phone);
  return { ok: true, application: r ? hydrate_(r) : null };
}

function list_(limit) {
  const all = rows_().map(hydrate_).reverse();
  return limit ? all.slice(0, limit) : all;
}

function update_(regId, status, note) {
  if (STATUSES.indexOf(status) === -1) throw new Error('Invalid status');
  const sh = sheet_();
  const data = sh.getDataRange().getValues();
  const idCol = COLUMNS.indexOf('regId');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === regId) {
      const now = new Date().toISOString();
      const hist = safeParse_(data[i][COLUMNS.indexOf('history')]);
      hist.push({ status, at: now, note: String(note || '').slice(0, 500) });
      sh.getRange(i + 1, COLUMNS.indexOf('status') + 1).setValue(status);
      sh.getRange(i + 1, COLUMNS.indexOf('updatedAt') + 1).setValue(now);
      sh.getRange(i + 1, COLUMNS.indexOf('history') + 1).setValue(JSON.stringify(hist));
      return { ok: true };
    }
  }
  throw new Error('Registration not found');
}

function remove_(regId) {
  const sh = sheet_();
  const data = sh.getDataRange().getValues();
  const idCol = COLUMNS.indexOf('regId');
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol] === regId) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  throw new Error('Registration not found');
}

/* ---------------- helpers ---------------- */

function auth_(key) {
  if (!key || key !== ADMIN_KEY) throw new Error('Unauthorized');
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLUMNS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#0f4433').setFontColor('#ffffff');
  }
  return sh;
}

function rows_() {
  const values = sheet_().getDataRange().getValues();
  values.shift();
  return values.map(row => {
    const o = {};
    COLUMNS.forEach((c, i) => o[c] = row[i] instanceof Date ? row[i].toISOString().slice(0, 10) : String(row[i]));
    return o;
  });
}

function hydrate_(r) {
  const o = Object.assign({}, r);
  o.history = safeParse_(r.history);
  return o;
}

function safeParse_(v) { try { return JSON.parse(v) || []; } catch (e) { return []; } }

// Prevent spreadsheet formula injection and cap field length.
function clean_(v) {
  if (v === undefined || v === null) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  s = s.slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
