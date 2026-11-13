/**
 * M.S.I. Inter College — Admission portal backend (Google Apps Script)
 * ---------------------------------------------------------------------
 * Free backend that powers the registration system:
 *   • Student / parent accounts (login works on any device)
 *   • Admission applications  → "Registrations" sheet
 *   • Photo & document uploads → Google Drive folder
 *   • Online fee payment       → Razorpay (verified server-side)
 *   • UPI payment with UTR, pay-at-office, admin verification
 *
 * SETUP — see backend/README.md for the step-by-step guide.
 *   1. Paste this file into Extensions → Apps Script of a new Google Sheet.
 *   2. Fill in the four constants below.
 *   3. Deploy → New deployment → Web app (Execute as: Me, Access: Anyone).
 *   4. Put the Web App URL in assets/js/config.js → APPS_SCRIPT_URL.
 * After editing: Deploy → Manage deployments → Edit → Version: New version.
 */

const ADMIN_KEY = 'CHANGE-ME-to-a-long-secret';   // staff passcode for admin.html
const RAZORPAY_KEY_ID = '';                         // rzp_live_xxx (same as config.js)
const RAZORPAY_KEY_SECRET = '';                     // NEVER put this in config.js
const SESSION = '2027-28';

/* Fee collected at registration — keep in sync with FEES in config.js. */
const FEES = {
  'middle':      { admission: 250, tuition: 350, lab: 0,   library: 150 },
  'high':        { admission: 250, tuition: 350, lab: 200, library: 150 },
  'inter':       { admission: 250, tuition: 350, lab: 200, library: 150 }
};
const CLASS_GROUP = {
  'Class 6': 'middle', 'Class 7': 'middle', 'Class 8': 'middle',
  'Class 9': 'high', 'Class 10': 'high', 'Class 11': 'inter', 'Class 12': 'inter'
};

const UPLOAD_FOLDER = 'MSI Admissions Uploads';
const APP_SHEET = 'Registrations';
const USER_SHEET = 'Users';
const APP_COLS = [
  'regId', 'createdAt', 'updatedAt', 'status', 'session', 'userId',
  'studentName', 'gender', 'dob', 'aadhaar', 'category', 'religion', 'nationality', 'bloodGroup',
  'applyClass', 'stream', 'medium',
  'fatherName', 'motherName', 'guardianOccupation', 'annualIncome', 'phone', 'altPhone', 'email',
  'address', 'city', 'pincode',
  'prevSchool', 'prevBoard', 'prevClass', 'prevPercent',
  'hostel', 'transport',
  'feeTotal', 'paymentStatus', 'paymentMethod', 'paymentRef', 'paymentAt', 'rzpOrderId',
  'photoUrl', 'marksheetUrl', 'aadhaarDocUrl', 'tcUrl', 'birthCertUrl',
  'history'
];
const USER_COLS = ['id', 'name', 'email', 'phone', 'salt', 'hash', 'createdAt'];
const STATUSES = ['submitted', 'review', 'approved', 'rejected'];
const PAY_STATUSES = ['unpaid', 'verification', 'office', 'paid', 'failed'];
const FILE_KEYS = { photo: 'photoUrl', marksheet: 'marksheetUrl', aadhaarDoc: 'aadhaarDocUrl', tc: 'tcUrl', birthCert: 'birthCertUrl' };

/* =============================== routing =============================== */

function doPost(e) {
  try {
    const r = JSON.parse((e.postData && e.postData.contents) || '{}');
    switch (r.action) {
      case 'signup':        return json(signup_(r));
      case 'login':         return json(login_(r));
      case 'me':            return json({ ok: true, user: publicUser_(userFromToken_(r.token)) });
      case 'submit':        return json(submit_(r));
      case 'myApps':        return json(myApps_(r.token));
      case 'status':        return json({ ok: true, application: strip_(findApp_(r.regId, r.phone)) });
      case 'payOrder':      return json(payOrder_(r));
      case 'payVerify':     return json(payVerify_(r));
      case 'payUpi':        return json(payUpi_(r));
      case 'payOffice':     return json(payOffice_(r));
      case 'list':          auth_(r.adminKey); return json({ ok: true, applications: listApps_(r.limit) });
      case 'update':        auth_(r.adminKey); return json(update_(r.regId, r.status, r.note));
      case 'verifyPayment': auth_(r.adminKey); return json(verifyPayment_(r.regId, r.paymentStatus, r.note));
      case 'resetPassword': auth_(r.adminKey); return json(resetPassword_(r.email, r.password));
      case 'delete':        auth_(r.adminKey); return json(remove_(r.regId));
      default:              return json({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  return json({ ok: true, service: 'MSI admission portal', time: new Date().toISOString() });
}

/* =============================== accounts =============================== */

function signup_(r) {
  const name = String(r.name || '').trim(), email = normEmail_(r.email), phone = normPhone_(r.phone), pw = String(r.password || '');
  if (name.length < 3) throw new Error('Name is required');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Invalid email');
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Invalid mobile number');
  if (pw.length < 8) throw new Error('Password must be at least 8 characters');
  return withLock_(() => {
    if (users_().some(u => u.email === email)) throw new Error('इस ईमेल से पहले ही खाता बना है | An account with this email already exists.');
    const salt = Utilities.getUuid();
    const user = { id: 'U' + Utilities.getUuid().replace(/-/g, '').slice(0, 12), name, email, phone, salt, hash: hashPw_(salt, pw), createdAt: new Date().toISOString() };
    sheet_(USER_SHEET, USER_COLS).appendRow(USER_COLS.map(c => clean_(user[c])));
    return { ok: true, token: makeToken_(user.id), user: publicUser_(user) };
  });
}

function login_(r) {
  const u = users_().find(x => x.email === normEmail_(r.email));
  if (!u || u.hash !== hashPw_(u.salt, String(r.password || ''))) throw new Error('ईमेल या पासवर्ड गलत है | Incorrect email or password.');
  return { ok: true, token: makeToken_(u.id), user: publicUser_(u) };
}

function resetPassword_(email, password) {
  if (String(password || '').length < 8) throw new Error('Password must be at least 8 characters');
  const sh = sheet_(USER_SHEET, USER_COLS), data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).toLowerCase() === normEmail_(email)) {
      const salt = Utilities.getUuid();
      sh.getRange(i + 1, 5, 1, 2).setValues([[salt, hashPw_(salt, password)]]);
      return { ok: true };
    }
  }
  throw new Error('No account with that email');
}

function hashPw_(salt, pw) {
  let h = salt + ':' + pw;
  for (let i = 0; i < 500; i++) h = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt));
  return h;
}

function secret_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('TOKEN_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('TOKEN_SECRET', s); }
  return s;
}
function makeToken_(userId) {
  const payload = userId + '.' + (Date.now() + 30 * 24 * 3600 * 1000);
  return payload + '.' + hex_(Utilities.computeHmacSha256Signature(payload, secret_()));
}
function userFromToken_(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Please log in again');
  const payload = parts[0] + '.' + parts[1];
  if (hex_(Utilities.computeHmacSha256Signature(payload, secret_())) !== parts[2] || +parts[1] < Date.now()) throw new Error('Session expired — please log in again');
  const u = users_().find(x => x.id === parts[0]);
  if (!u) throw new Error('Account not found');
  return u;
}
function publicUser_(u) { return { id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt }; }

/* ============================= applications ============================= */

function submit_(r) {
  const d = r.data || {};
  const user = r.token ? userFromToken_(r.token) : null;
  const phone = normPhone_(d.phone);
  if (!d.studentName || !d.fatherName || !d.applyClass) throw new Error('Missing required fields');
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Invalid mobile number');
  const group = CLASS_GROUP[d.applyClass];
  if (!group) throw new Error('Invalid class');
  if (group === 'inter' && !d.stream) throw new Error('Stream is required for Class 11/12');
  if (!r.files || !r.files.photo) throw new Error('Student photograph is required');

  return withLock_(() => {
    if (appRows_().filter(a => a.phone === phone).length >= 5) throw new Error('Too many applications for this mobile number');
    const regId = 'MSI' + String(new Date().getFullYear()).slice(-2) + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
    const now = new Date().toISOString();
    const rec = Object.assign({}, d, {
      regId, phone, email: normEmail_(d.email), session: SESSION, userId: user ? user.id : '',
      status: 'submitted', createdAt: now, updatedAt: now,
      feeTotal: feeFor_(d.applyClass), paymentStatus: 'unpaid',
      history: JSON.stringify([{ status: 'submitted', at: now, note: 'Application received online' }])
    });
    // Save uploads to Drive
    const folder = folder_(regId);
    Object.keys(FILE_KEYS).forEach(k => {
      if (r.files[k]) rec[FILE_KEYS[k]] = saveFile_(folder, regId + '_' + k, r.files[k]);
    });
    sheet_(APP_SHEET, APP_COLS).appendRow(APP_COLS.map(c => clean_(rec[c])));
    return { ok: true, regId, feeTotal: rec.feeTotal, application: strip_(hydrate_(rec)) };
  });
}

function myApps_(token) {
  const u = userFromToken_(token);
  return { ok: true, applications: appRows_().filter(a => a.userId === u.id).map(hydrate_).map(strip_).reverse() };
}

function findApp_(regId, phone) {
  regId = String(regId || '').trim().toUpperCase();
  phone = normPhone_(phone);
  const a = appRows_().find(x => x.regId === regId && x.phone === phone);
  return a ? hydrate_(a) : null;
}
function requireApp_(r) {
  const a = findApp_(r.regId, r.phone);
  if (!a) throw new Error('Application not found');
  return a;
}

/* =============================== payments =============================== */

function payOrder_(r) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) throw new Error('Online payment is not configured');
  const a = requireApp_(r);
  if (a.paymentStatus === 'paid') throw new Error('Fee already paid');
  const amount = Math.round(Number(a.feeTotal) * 100);
  const res = UrlFetchApp.fetch('https://api.razorpay.com/v1/orders', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET) },
    payload: JSON.stringify({ amount, currency: 'INR', receipt: a.regId, notes: { regId: a.regId, student: a.studentName } })
  });
  const order = JSON.parse(res.getContentText());
  if (res.getResponseCode() >= 300) throw new Error((order.error && order.error.description) || 'Could not create payment order');
  setFields_(a.regId, { rzpOrderId: order.id });
  return { ok: true, orderId: order.id, amount, keyId: RAZORPAY_KEY_ID };
}

function payVerify_(r) {
  const a = requireApp_(r);
  if (!a.rzpOrderId || a.rzpOrderId !== r.orderId) throw new Error('Order mismatch');
  const expected = hex_(Utilities.computeHmacSha256Signature(r.orderId + '|' + r.paymentId, RAZORPAY_KEY_SECRET));
  if (expected !== r.signature) {
    setFields_(a.regId, { paymentStatus: 'failed' }, 'Payment signature verification failed');
    throw new Error('Payment could not be verified');
  }
  const now = new Date().toISOString();
  setFields_(a.regId, { paymentStatus: 'paid', paymentMethod: 'Razorpay', paymentRef: r.paymentId, paymentAt: now },
             'Fee ₹' + a.feeTotal + ' paid online (' + r.paymentId + ')', 'paid');
  return { ok: true, application: strip_(findApp_(a.regId, a.phone)) };
}

function payUpi_(r) {
  const a = requireApp_(r);
  const utr = String(r.utr || '').replace(/\s/g, '');
  if (!/^[A-Za-z0-9]{10,22}$/.test(utr)) throw new Error('Enter a valid UTR / transaction ID');
  if (a.paymentStatus === 'paid') throw new Error('Fee already paid');
  if (appRows_().some(x => x.paymentRef === utr && x.regId !== a.regId)) throw new Error('This UTR has already been used');
  const extra = {};
  if (r.screenshot) extra.paymentProof = saveFile_(folder_(a.regId), a.regId + '_upi_proof', r.screenshot);
  setFields_(a.regId, { paymentStatus: 'verification', paymentMethod: 'UPI', paymentRef: utr, paymentAt: new Date().toISOString() },
             'UPI payment submitted, UTR ' + utr + (extra.paymentProof ? ' (proof: ' + extra.paymentProof + ')' : ''), 'verification');
  return { ok: true, application: strip_(findApp_(a.regId, a.phone)) };
}

function payOffice_(r) {
  const a = requireApp_(r);
  if (a.paymentStatus === 'paid') throw new Error('Fee already paid');
  setFields_(a.regId, { paymentStatus: 'office', paymentMethod: 'At office' }, 'Will pay at the college office', 'office');
  return { ok: true, application: strip_(findApp_(a.regId, a.phone)) };
}

function verifyPayment_(regId, status, note) {
  if (PAY_STATUSES.indexOf(status) === -1) throw new Error('Invalid payment status');
  const f = { paymentStatus: status };
  if (status === 'paid') f.paymentAt = new Date().toISOString();
  setFields_(regId, f, note || ('Payment marked ' + status + ' by office'), status === 'paid' ? 'paid' : null);
  return { ok: true };
}

/* ================================ admin ================================= */

function listApps_(limit) {
  const all = appRows_().map(hydrate_).reverse();
  return limit ? all.slice(0, limit) : all;
}

function update_(regId, status, note) {
  if (STATUSES.indexOf(status) === -1) throw new Error('Invalid status');
  setFields_(regId, { status }, note || '', status);
  return { ok: true };
}

function remove_(regId) {
  const sh = sheet_(APP_SHEET, APP_COLS), data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) if (data[i][0] === regId) { sh.deleteRow(i + 1); return { ok: true }; }
  throw new Error('Registration not found');
}

/* =============================== helpers ================================ */

function setFields_(regId, fields, note, histStatus) {
  return withLock_(() => {
    const sh = sheet_(APP_SHEET, APP_COLS), data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] !== regId) continue;
      const now = new Date().toISOString();
      fields.updatedAt = now;
      if (note || histStatus) {
        const hist = safeParse_(data[i][APP_COLS.indexOf('history')]);
        hist.push({ status: histStatus || data[i][APP_COLS.indexOf('status')], at: now, note: String(note || '').slice(0, 500) });
        fields.history = JSON.stringify(hist);
      }
      Object.keys(fields).forEach(k => {
        const c = APP_COLS.indexOf(k);
        if (c >= 0) sh.getRange(i + 1, c + 1).setValue(clean_(fields[k]));
      });
      return true;
    }
    throw new Error('Registration not found');
  });
}

function feeFor_(cls) {
  const f = FEES[CLASS_GROUP[cls]];
  return f ? f.admission + f.tuition + f.lab + f.library : 0;
}

function folder_(regId) {
  const it = DriveApp.getFoldersByName(UPLOAD_FOLDER);
  const root = it.hasNext() ? it.next() : DriveApp.createFolder(UPLOAD_FOLDER);
  const sub = root.getFoldersByName(regId);
  return sub.hasNext() ? sub.next() : root.createFolder(regId);
}

function saveFile_(folder, name, dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Unsupported file type (use JPG, PNG or PDF)');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > 3 * 1024 * 1024) throw new Error('File too large (max 3 MB)');
  const ext = m[1] === 'application/pdf' ? '.pdf' : m[1] === 'image/png' ? '.png' : '.jpg';
  return folder.createFile(Utilities.newBlob(bytes, m[1], name + ext)).getUrl();
}

function auth_(key) { if (!key || key !== ADMIN_KEY) throw new Error('Unauthorized'); }

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function sheet_(name, cols) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(cols);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cols.length).setFontWeight('bold').setBackground('#0f4433').setFontColor('#ffffff');
  }
  return sh;
}

function rowsOf_(name, cols) {
  const v = sheet_(name, cols).getDataRange().getValues();
  v.shift();
  return v.map(row => {
    const o = {};
    cols.forEach((c, i) => o[c] = row[i] instanceof Date ? row[i].toISOString().slice(0, 10) : String(row[i]));
    return o;
  });
}
function appRows_() { return rowsOf_(APP_SHEET, APP_COLS); }
function users_() { return rowsOf_(USER_SHEET, USER_COLS); }

function hydrate_(r) { const o = Object.assign({}, r); o.history = safeParse_(r.history); o.feeTotal = Number(r.feeTotal) || 0; return o; }
// Applicant-facing copy: hide internal / document links.
function strip_(a) {
  if (!a) return null;
  const o = Object.assign({}, a);
  ['userId', 'rzpOrderId', 'aadhaar', 'marksheetUrl', 'aadhaarDocUrl', 'tcUrl', 'birthCertUrl', 'photoUrl'].forEach(k => delete o[k]);
  return o;
}
function safeParse_(v) { if (Array.isArray(v)) return v; try { return JSON.parse(v) || []; } catch (e) { return []; } }
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function normPhone_(p) { return String(p || '').replace(/\D/g, '').slice(-10); }
function hex_(bytes) { return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join(''); }
// Prevent spreadsheet formula injection, cap length.
function clean_(v) {
  if (v === undefined || v === null) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  s = s.slice(0, 5000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
