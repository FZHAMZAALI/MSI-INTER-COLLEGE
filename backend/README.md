# Admission portal backend (Google Sheets + Drive + Razorpay)

Without a backend the portal runs in **demo mode**: accounts, applications and
payments are saved only in the visitor's own browser. Use it to try the flow;
switch to the backend below before going live.

## 1. Google Sheet + Apps Script (free)

1. Log in to the **school's** Google account and create a new Google Sheet,
   e.g. **MSI Admissions 2027-28**.
2. **Extensions → Apps Script**. Delete the sample code and paste
   [`google-apps-script.gs`](google-apps-script.gs).
3. Edit the constants at the top:
   - `ADMIN_KEY` – a long secret; staff type this on `admin.html`.
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` – see step 3 (leave empty if not using Razorpay).
   - `SESSION`, and the `FEES` table (must match `config.js`).
4. **Deploy → New deployment → Web app** — Execute as **Me**, Who has access **Anyone**.
   Approve the permissions (Sheets, Drive, external requests).
5. Copy the Web app URL into `assets/js/config.js`:
   ```js
   APPS_SCRIPT_URL: "https://script.google.com/macros/s/XXXX/exec",
   ADMIN_PASSCODE: "",          // leave empty on the live site
   ```

The script creates two sheets — **Registrations** and **Users** — and a Drive
folder **MSI Admissions Uploads** with one sub-folder per Registration ID for the
photo and documents.

## 2. UPI payments (free, direct to the school account)

In `config.js` set `PAYMENT.UPI_ID` to the school's UPI ID (from the bank /
BHIM / merchant QR) and `UPI_PAYEE_NAME`. Parents scan the QR (or tap "Open UPI
app" on mobile), pay, and enter the 12-digit UTR. The application shows
**"UPI — verify"** in the admin panel; check the bank statement and click
**Mark fee received** (or **UTR not found**).

## 3. Razorpay (cards, UPI, net banking — instant, auto-verified)

1. Create an account at <https://dashboard.razorpay.com> and complete KYC with
   the school's bank account (education institutions are supported).
2. **Settings → API Keys → Generate key**. Test keys start with `rzp_test_`,
   live keys with `rzp_live_`.
3. Put the **Key ID** in `config.js → PAYMENT.RAZORPAY_KEY_ID` **and** in the
   Apps Script. Put the **Key Secret only in the Apps Script** — never in `config.js`.
4. Redeploy the Apps Script (Manage deployments → Edit → New version).

Flow: the server creates a Razorpay order for the fee it calculates from the
class (the browser cannot change the amount), the parent pays in Razorpay
Checkout, and the server verifies the payment signature before marking the fee
**Paid**. Razorpay charges a gateway fee per transaction (about 2%).

## What works where

| Feature | Demo mode | Backend mode |
|---|---|---|
| Accounts / login | this browser | any device |
| Applications, photo, documents | this browser | Sheet + Drive |
| Track by Reg. ID + mobile | same device | any device |
| Razorpay | test key, unverified | verified server-side |
| UPI QR + UTR, pay at office | ✓ | ✓ |
| Admin panel | this browser's data | all applications, passcode checked on server |
| Password reset by office | ✓ | ✓ |
