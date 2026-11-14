-- M.S.I. Inter College — D1 (SQLite) schema.
-- Only the `msi-api` Worker can read or write this database.
-- JSON values are stored as TEXT and parsed by the Worker.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS staff (
  email TEXT PRIMARY KEY,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  uid TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  photo_url TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS applications (
  reg_id TEXT PRIMARY KEY,
  uid TEXT,
  session TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','review','approved','rejected')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending','office','paid','failed')),
  fee_total INTEGER NOT NULL DEFAULT 0,
  fee_breakup TEXT NOT NULL DEFAULT '{}',
  student_name TEXT NOT NULL,
  father_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  apply_class TEXT NOT NULL,
  stream TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  files TEXT NOT NULL DEFAULT '{}',
  history TEXT NOT NULL DEFAULT '[]',
  payment_method TEXT,
  payment_ref TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS applications_uid_idx ON applications(uid);
CREATE INDEX IF NOT EXISTS applications_phone_idx ON applications(phone);
CREATE INDEX IF NOT EXISTS applications_created_idx ON applications(created_at);

CREATE TABLE IF NOT EXISTS payments (
  txnid TEXT PRIMARY KEY,
  reg_id TEXT NOT NULL REFERENCES applications(reg_id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  gateway TEXT NOT NULL DEFAULT 'payu',
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','success','failure','pending','cash')),
  gateway_ref TEXT,
  mode TEXT,
  return_url TEXT,
  raw TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS payments_reg_idx ON payments(reg_id);

CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  body TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','admission','exam','result','holiday','event')),
  link_url TEXT,
  file_url TEXT,
  is_new INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  published_on TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS gallery (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  url TEXT NOT NULL,
  caption TEXT,
  category TEXT NOT NULL DEFAULT 'campus' CHECK (category IN ('campus','labs','sports','events')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS toppers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  exam TEXT NOT NULL,
  stream TEXT,
  percent REAL,
  rank_text TEXT,
  year TEXT,
  photo_url TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS leaders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  message TEXT,
  photo_url TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','resolved')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
