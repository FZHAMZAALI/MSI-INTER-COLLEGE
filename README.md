# M.S.I. Inter College — Website & Admission Portal

Official website of **Miyan Sahab Islamia Inter College**, Bakshipur, Gorakhpur (est. 1908).
Static frontend (no build step) + Supabase backend + Sign in with Google (Google Identity Services) + PayU payments.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Public website. Ticker, stats, leadership, toppers, notices, gallery and contact details are loaded live from the database and managed in the admin panel. Contact-form messages go to Admin → Enquiries. |
| `register.html` | Parent portal: Sign in with Google / One Tap, 5-step admission form with photo/document upload, PayU online payment or pay-at-office, printable application form & fee receipt, dashboard with status tracker, track by Reg. ID + mobile. |
| `admin.html` | Admin panel (Google Sign-in, staff only): dashboard, applications (documents, status, cash receipts), payments, enquiries, parent accounts, notices, gallery, toppers, leadership, settings (session, fees, PayU, contact, map), staff access. |

## Architecture

```
Browser ──► Google Identity Services (button + One Tap) ──► Google ID token
   │
   └──► Supabase Edge Function `api`  (verifies the Google token, checks staff role)
            ├── Postgres tables (RLS on, no public policies — only the API can read/write)
            ├── Storage: applicant-docs (private, signed URLs) · site-media (public)
            └── PayU: hash computed server-side; `payu` function verifies the callback
                with the reverse hash + PayU verify_payment API before marking "Paid".
```

- Supabase project: `msi-inter-college` (ap-south-1)
- Edge functions: `supabase/functions/api`, `supabase/functions/payu`
- Schema: `supabase/migrations/`
- PayU key/salt live only in the `app_secrets` table (server-side). Update them in Admin → Settings.

## One-time setup

### 1. Sign in with Google (Google Cloud)
Project `msi-inter-college` in Google Cloud Console already has an OAuth **Web** client.
- **APIs & Services → Credentials → OAuth client → Authorized JavaScript origins**: list every
  domain the site is served from (currently `https://msiintercollege.vercel.app`). Add a custom
  domain here too if you add one.
- **OAuth consent screen**: app name, logo and support email are what parents see; keep it **Published**.
- The Client ID lives in the database setting `google` (`{"clientId": "…"}`) and in `assets/js/config.js`.
  The client secret is not used and must never be committed.

### 2. First administrator
Open `admin.html`, sign in with Google, and enter the one-time **setup code** you were given.
That account becomes administrator; the code then stops working. Add other staff in
Admin → Staff access.

### 3. Hosting
Any static host works (GitHub Pages, Netlify, Vercel, cPanel). Upload the repository root.

## Configuration

- `assets/js/config.js` — API URL + publishable key (already set), Firebase config, map defaults.
- Everything else (session, admissions open/closed, fees, PayU, contact, ticker, stats,
  map key) — **Admin → Settings**.
