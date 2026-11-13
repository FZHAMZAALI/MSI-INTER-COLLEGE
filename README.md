# M.S.I. Inter College — Website & Admission Portal

Official website of **Miyan Sahab Islamia Inter College**, Bakshipur, Gorakhpur (est. 1908).
Static frontend (no build step) + Supabase backend + Firebase Google Sign-in + PayU payments.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Public website. Ticker, stats, leadership, toppers, notices, gallery and contact details are loaded live from the database and managed in the admin panel. Contact-form messages go to Admin → Enquiries. |
| `register.html` | Parent portal: Google Sign-in, 5-step admission form with photo/document upload, PayU online payment or pay-at-office, printable application form & fee receipt, dashboard with status tracker, track by Reg. ID + mobile. |
| `admin.html` | Admin panel (Google Sign-in, staff only): dashboard, applications (documents, status, cash receipts), payments, enquiries, parent accounts, notices, gallery, toppers, leadership, settings (session, fees, PayU, contact, map), staff access. |

## Architecture

```
Browser ──► Firebase Auth (Google Sign-in) ──► ID token
   │
   └──► Supabase Edge Function `api`  (verifies the Firebase token, checks staff role)
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

### 1. Firebase (Google Sign-in)
1. <https://console.firebase.google.com> → **Add project** → name it `msi-inter-college`.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** (choose a support email) → Save.
3. **Project settings (⚙) → Your apps → Web (`</>`)** → register app → copy the `firebaseConfig`
   (`apiKey`, `authDomain`, `projectId`, `appId`). These values are public.
4. Put them in `assets/js/config.js → FIREBASE`, and set the same `projectId` in the
   database setting `firebase` (the API uses it to verify tokens):
   ```sql
   insert into settings(key, value, is_public)
   values ('firebase', '{"apiKey":"…","authDomain":"…","projectId":"…","appId":"…"}', true)
   on conflict (key) do update set value = excluded.value;
   ```
5. **Authentication → Settings → Authorized domains** → add the website's domain
   (e.g. `fzhamzaali.github.io` or your own domain).

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
