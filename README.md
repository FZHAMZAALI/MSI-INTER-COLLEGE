# M.S.I. Inter College — Website & Admission Portal

Official website of **Miyan Sahab Islamia Inter College**, Bakshipur, Gorakhpur (est. 1908).
Static frontend (no build step) on Cloudflare Pages + Cloudflare Worker API (D1 database, R2 storage) + Sign in with Google + PayU payments. Everything runs on free plans that never pause.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Public website. Ticker, stats, leadership, toppers, notices, gallery and contact details are loaded live from the database and managed in the admin panel. Contact-form messages go to Admin → Enquiries. |
| `register.html` | Parent portal: Sign in with Google / One Tap, 5-step admission form with photo/document upload, PayU online payment or pay-at-office, printable application form & fee receipt, dashboard with status tracker, track by Reg. ID + mobile. |
| `admin.html` | Admin panel (Google Sign-in, staff only): dashboard, applications (documents, status, cash receipts), payments, enquiries, parent accounts, notices, gallery, toppers, leadership, settings (session, fees, PayU, contact, map), staff access. |

## Architecture

```
Browser (msi-inter-college.pages.dev)
   ├──► Google Identity Services (button + One Tap) ──► Google ID token
   └──► Cloudflare Worker `msi-api`  (cloudflare/src/index.ts)
            ├── verifies the Google token (RS256, Google public keys) and staff role
            ├── D1 database `msi-college`      — applications, payments, settings, content
            ├── R2 `msi-applicant-docs` (private) — served only via signed, expiring links
            ├── R2 `msi-site-media` (public)       — gallery / notice / topper images
            ├── PUT /upload — files go straight to R2 using signed, short-lived tickets
            └── PayU: hash computed in the Worker; /payu callback checks the reverse hash
                and PayU's verify_payment API before marking a fee "Paid".
```

- Worker config: `cloudflare/wrangler.toml` · schema: `cloudflare/schema.sql`
- Secrets: `SIGNING_KEY` (Worker secret); PayU key/salt in the D1 `app_secrets` table — edit in Admin → Settings.
- Free-plan limits: Workers 100k requests/day, D1 5 GB, R2 10 GB (storage meter on the admin dashboard).
- Deploy the API: `cd cloudflare && npx wrangler deploy` · Deploy the site: `npx wrangler pages deploy <site-folder> --project-name msi-inter-college`

## One-time setup

### 1. Sign in with Google (Google Cloud)
Project `msi-inter-college` in Google Cloud Console already has an OAuth **Web** client.
- **APIs & Services → Credentials → OAuth client → Authorized JavaScript origins**: list every
  domain the site is served from (`https://msi-inter-college.pages.dev`, and any custom domain). Add a custom
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
