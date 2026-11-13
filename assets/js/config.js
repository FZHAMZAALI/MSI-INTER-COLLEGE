/* ==========================================================================
   SITE CONFIGURATION — edit this file only.
   ========================================================================== */
window.MSI_CONFIG = {
  /* ---------------- Google Maps ----------------
     1. https://console.cloud.google.com → create a project
     2. Enable "Maps JavaScript API" (and "Directions API" + "Geocoding API"
        for route drawing and auto-locating the campus)
     3. Credentials → Create API key → restrict it to HTTP referrers
        (e.g. https://yourdomain.com/*) and to the APIs above
     4. Paste the key below.
     Leave it empty and the site falls back to a free embedded Google Map
     (no key needed) — everything still works, just without the custom
     styled map and in-page route drawing. */
  GOOGLE_MAPS_API_KEY: "",

  /* Optional: a Map ID from Cloud Console → Map Management, for
     cloud-based styling. Leave empty to use the built-in style. */
  GOOGLE_MAPS_MAP_ID: "",

  /* Campus location. The map also tries to geocode PLACE_QUERY at runtime;
     these coordinates are the fallback. Right-click the gate in Google Maps
     → copy the numbers, and paste them here for pin-point accuracy. */
  CAMPUS: {
    name: "M.S.I. Inter College",
    placeQuery: "Miyan Sahab Islamia Inter College, Bakshipur, Gorakhpur, Uttar Pradesh 273001",
    lat: 26.7563,
    lng: 83.3697
  },

  /* Landmarks shown as quick-route chips under the map. */
  LANDMARKS: [
    { id: "railway", label: "Railway Station", icon: "fa-train",      query: "Gorakhpur Junction railway station" },
    { id: "bus",     label: "Bus Stand",       icon: "fa-bus",        query: "Gorakhpur Railway Bus Station" },
    { id: "airport", label: "Airport",         icon: "fa-plane",      query: "Gorakhpur Airport" }
  ],

  /* ---------------- Registration backend ----------------
     Without a backend, registrations are stored in the visitor's browser
     (localStorage) — fine for demos, NOT for real admissions.
     For real use, deploy backend/google-apps-script.gs (free, stores every
     application in a Google Sheet) and paste the Web App URL here. */
  APPS_SCRIPT_URL: "",

  /* Admin panel passcode (admin.html). With APPS_SCRIPT_URL set, the same
     value must be set as ADMIN_KEY in the Apps Script — it is then checked
     server-side. In local mode it only gates this browser's demo data. */
  ADMIN_PASSCODE: "msi@1908",

  /* Session & fees */
  SESSION: "2027-28",
  CONTACT_PHONE: "+91 91692 52529",
  WHATSAPP: "919169252529",

  /* Fee estimate shown on the registration form (₹). Edit to match the
     current fee notice. "lab" applies to science/computer lab users. */
  FEES: {
    "pre-primary": { admission: 250, tuition: 350, lab: 0,   library: 150 },
    "primary":     { admission: 250, tuition: 350, lab: 0,   library: 150 },
    "middle":      { admission: 250, tuition: 350, lab: 0,   library: 150 },
    "high":        { admission: 250, tuition: 350, lab: 200, library: 150 },
    "inter":       { admission: 250, tuition: 350, lab: 200, library: 150 }
  }
};
