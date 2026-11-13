# M.S.I. Inter College — Website

Official website of **Miyan Sahab Islamia Inter College**, Bakshipur, Gorakhpur (est. 1908).

Static site — no build step. Open `index.html` or host the folder on any static host
(GitHub Pages, Netlify, Vercel, cPanel).

## Pages

| File | Purpose |
|---|---|
| `index.html` | Main website: about, leadership, programs, toppers, facilities, student life, admissions, notices, gallery, FAQ, contact + Google Map |
| `register.html` | Student portal: account / login, 5-step admission form with photo & document upload, fee payment (Razorpay, UPI QR, at office), printable application form & fee receipt, dashboard with status tracker, track by Reg. ID + mobile |
| `admin.html` | Staff panel: search / filter, view photo & documents, verify UPI payments, fee-collection totals, update status with a note, reset parent passwords, WhatsApp the parent, export CSV |

## Configuration — `assets/js/config.js`

### Google Maps
1. In [Google Cloud Console](https://console.cloud.google.com/) enable **Maps JavaScript API**
   (plus **Directions API** and **Geocoding API** for in-page routes and auto-location).
2. Create an API key and restrict it to your domain (HTTP referrers) and those APIs.
3. Paste it into `GOOGLE_MAPS_API_KEY`.
4. For pin-point accuracy, right-click the college gate in Google Maps, copy the
   coordinates, and set `CAMPUS.lat` / `CAMPUS.lng`.

Without a key the site uses a keyless Google Maps embed automatically, with the same
route buttons (railway station, bus stand, airport, "from my location").

### Registration backend & payments
See [`backend/README.md`](backend/README.md) — Google Sheet + Drive backend, UPI and Razorpay setup.

### Other settings
`SESSION`, `CONTACT_PHONE`, `WHATSAPP`, and the `FEES` table shown on the form.

## Structure

```
assets/css/main.css     design system + responsive layout
assets/js/config.js     all settings
assets/js/main.js       navigation, animations, gallery, contact form
assets/js/maps.js       Google Maps integration
assets/js/store.js      data layer (localStorage or Google Sheets)
assets/js/portal.js     student portal
assets/js/admin.js      admin panel
backend/                Google Apps Script for the Sheets backend
images/                 campus photos
```
