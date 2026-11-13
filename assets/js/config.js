/* ==========================================================================
   SITE CONFIGURATION
   Most settings (session, fees, contact, notices, gallery, payment…) are
   managed from the Admin Panel and stored in the database — not here.
   ========================================================================== */
window.MSI_CONFIG = {
  /* Backend (Supabase project "msi-inter-college"). The publishable key is
     safe to expose: tables are locked by Row Level Security and every
     request goes through the server-side API, which checks the user. */
  API_URL: "https://mfdygxmnhbzmwwvtzwmg.supabase.co/functions/v1/api",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_r6a0_Cqc4OHNrb2xHSiTeQ_w7kRa_Ui",

  /* Firebase web config for Google Sign-in (Firebase console → Project
     settings → Your apps → Web app → SDK setup and configuration).
     These values are public by design. */
  FIREBASE: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
  },

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
