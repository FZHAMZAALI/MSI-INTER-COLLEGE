# Registration backend (Google Sheets)

Out of the box the registration system runs in **demo mode**: accounts and
applications are saved in the visitor's own browser (localStorage). That is
enough to try the flow, but the college never sees those applications.

To receive every application in a Google Sheet (free, no server needed):

1. Create a new Google Sheet, e.g. **MSI Admissions**.
2. **Extensions → Apps Script**. Delete the sample code and paste
   [`google-apps-script.gs`](google-apps-script.gs).
3. Change `ADMIN_KEY` at the top to a long secret.
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the Web app URL.
6. In `assets/js/config.js` set:
   ```js
   APPS_SCRIPT_URL: "https://script.google.com/macros/s/XXXX/exec",
   ADMIN_PASSCODE:  "<the same secret as ADMIN_KEY>",
   ```

What changes in remote mode:

| Feature | Demo mode | Google Sheets mode |
|---|---|---|
| Application storage | visitor's browser | `Registrations` sheet |
| Track by Reg. ID + mobile | same device only | any device |
| Admin panel (`admin.html`) | this browser's data | all applications, passcode checked on server |
| Status updates | local | written to the sheet, visible to the applicant |

Student login accounts stay per-device in both modes; the Registration ID +
mobile number lookup is what works everywhere.

> Note: in Google Sheets mode, `ADMIN_PASSCODE` is still visible in
> `config.js` to anyone who opens the page source. Leave it **empty** in
> `config.js` on the live site — staff then type the passcode on
> `admin.html`, and only the Apps Script knows the real value.
