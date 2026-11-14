/* ==========================================================================
   SITE CONFIGURATION
   Most settings (session, fees, contact, notices, gallery, payment…) are
   managed from the Admin Panel and stored in the database — not here.
   ========================================================================== */
window.MSI_CONFIG = {
  /* Backend: Cloudflare Worker "msi-api" (D1 database + R2 storage), served
     from the website's own domain through Pages Functions (functions/). */
  API_URL: "https://msi-inter-college.pages.dev/api",

  /* Google OAuth Client ID for "Sign in with Google" (Google Cloud Console →
     APIs & Services → Credentials). Public by design. Also stored in the
     database setting "google", which takes precedence. */
  GOOGLE_CLIENT_ID: "910461644511-oaiou7d98p36fgfjs4r7212iosb204k9.apps.googleusercontent.com",

  /* Campus location — decoded from the school's official DIGIPIN
     (2J8-MK8-74JF, ±4 m). Admins can override it in Settings → Map. */
  CAMPUS: {
    name: "M.S.I. Inter College",
    placeQuery: "M.S.I. Inter College, Bakshipur, Gorakhpur, Uttar Pradesh 273001",
    lat: 26.754362,
    lng: 83.36165
  },

  LANDMARKS: [
    { id: "railway", label: "Railway Station", icon: "fa-train", query: "Gorakhpur Junction railway station" },
    { id: "bus",     label: "Bus Stand",       icon: "fa-bus",   query: "Gorakhpur Railway Bus Station" },
    { id: "airport", label: "Airport",         icon: "fa-plane", query: "Gorakhpur Airport" }
  ],

  /* Google Maps JavaScript API key (optional — without it a keyless Google
     Maps embed is used). Can also be set in Admin → Settings → Map. */
  GOOGLE_MAPS_API_KEY: "",
  GOOGLE_MAPS_MAP_ID: ""
};
