/* ==========================================================================
   Google Maps integration
   - With API key  : styled Maps JavaScript API map, custom marker, info
                     window, in-page route drawing from landmarks, distance
                     & travel time, "my location" routing.
   - Without key   : keyless Google Maps embed (iframe) with the same chips.
   ========================================================================== */
(function () {
  "use strict";
  const CFG = window.MSI_CONFIG || {};
  const CAMPUS = CFG.CAMPUS;
  const KEY = (CFG.GOOGLE_MAPS_API_KEY || "").trim();
  const MAP_ID = (CFG.GOOGLE_MAPS_MAP_ID || "").trim();

  const shell = document.getElementById("mapShell");
  if (!shell || !CAMPUS) return;
  const canvas = shell.querySelector(".map-canvas");
  const toolbar = shell.querySelector(".map-toolbar");
  const info = shell.querySelector(".map-route-info");

  const dirUrl = (origin) =>
    "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(CAMPUS.placeQuery) +
    (origin ? "&origin=" + encodeURIComponent(origin) : "") + "&travelmode=driving";

  /* ---------- toolbar ---------- */
  function buildToolbar(onLandmark, onMyLocation) {
    const frag = document.createDocumentFragment();
    const mk = (html, cls) => { const b = document.createElement("button"); b.type = "button"; b.className = "map-chip " + (cls || ""); b.innerHTML = html; return b; };

    const home = mk('<i class="fas fa-school"></i> Campus', "active");
    home.addEventListener("click", () => { setActive(home); onLandmark(null); });
    frag.appendChild(home);

    (CFG.LANDMARKS || []).forEach(l => {
      const b = mk('<i class="fas ' + l.icon + '"></i> ' + l.label);
      b.addEventListener("click", () => { setActive(b); onLandmark(l); });
      frag.appendChild(b);
    });

    const me = mk('<i class="fas fa-location-crosshairs"></i> From my location');
    me.addEventListener("click", () => { setActive(me); onMyLocation(); });
    frag.appendChild(me);

    const open = document.createElement("a");
    open.className = "map-chip"; open.target = "_blank"; open.rel = "noopener";
    open.href = dirUrl(""); open.innerHTML = '<i class="fas fa-diamond-turn-right"></i> Open in Google Maps';
    frag.appendChild(open);

    toolbar.innerHTML = "";
    toolbar.appendChild(frag);
  }
  function setActive(btn) { toolbar.querySelectorAll(".map-chip").forEach(c => c.classList.toggle("active", c === btn)); }
  function showInfo(html) { info.innerHTML = html; info.classList.add("show"); }
  function hideInfo() { info.classList.remove("show"); }

  function locate() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => reject(new Error("Location permission denied")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  /* ======================= Keyless fallback ======================= */
  function initEmbed() {
    const frame = document.createElement("iframe");
    frame.title = "Map: " + CAMPUS.name;
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer-when-downgrade";
    frame.allowFullscreen = true;
    const place = "https://maps.google.com/maps?q=" + encodeURIComponent(CAMPUS.placeQuery) + "&z=16&output=embed";
    frame.src = place;
    canvas.innerHTML = ""; canvas.appendChild(frame);

    buildToolbar(
      (l) => {
        hideInfo();
        frame.src = l
          ? "https://maps.google.com/maps?saddr=" + encodeURIComponent(l.query) + "&daddr=" + encodeURIComponent(CAMPUS.placeQuery) + "&output=embed"
          : place;
      },
      async () => {
        try {
          const p = await locate();
          frame.src = "https://maps.google.com/maps?saddr=" + p.lat + "," + p.lng + "&daddr=" + encodeURIComponent(CAMPUS.placeQuery) + "&output=embed";
        } catch (e) {
          showInfo('<i class="fas fa-circle-info"></i> ' + e.message + ' — <a href="' + dirUrl("") + '" target="_blank" rel="noopener"><strong>open Google Maps</strong></a>');
        }
      }
    );
  }

  /* ======================= Maps JavaScript API ======================= */
  const STYLE = [
    { elementType: "geometry", stylers: [{ color: "#f5efe3" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#5e6b65" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#fbf8f2" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#ebe1cd" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#cfe6d8" }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fdfbf6" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f1d9a2" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#ddb45a" }] },
    { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#d6ccb8" }] },
    { featureType: "transit.station", elementType: "labels.icon", stylers: [{ saturation: -40 }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#b9dccb" }] }
  ];

  const PIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="64" viewBox="0 0 52 64">' +
    '<path d="M26 63C26 63 50 38.5 50 25A24 24 0 1 0 2 25c0 13.5 24 38 24 38z" fill="#0f4433" stroke="#ddb45a" stroke-width="3"/>' +
    '<circle cx="26" cy="25" r="13" fill="#ddb45a"/>' +
    '<path d="M18 30V21l8-5 8 5v9h-5v-6h-6v6z" fill="#0f4433"/></svg>';

  function initJsApi() {
    window.__msiMapInit = async function () {
      const g = window.google.maps;
      let center = { lat: CAMPUS.lat, lng: CAMPUS.lng };

      const map = new g.Map(canvas, Object.assign({
        center, zoom: 16,
        mapTypeControl: false, streetViewControl: true, fullscreenControl: true,
        gestureHandling: "cooperative", clickableIcons: false
      }, MAP_ID ? { mapId: MAP_ID } : { styles: STYLE }));

      const marker = new g.Marker({
        map, position: center, title: CAMPUS.name, animation: g.Animation.DROP,
        icon: { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(PIN_SVG), scaledSize: new g.Size(52, 64), anchor: new g.Point(26, 63) }
      });

      const iw = new g.InfoWindow({
        content:
          '<div style="font-family:Inter,system-ui,sans-serif;max-width:240px;padding:2px">' +
          '<strong style="font-size:15px;color:#0a3326">मियाँ साहब इस्लामिया इण्टर कॉलेज</strong>' +
          '<div style="font-size:12.5px;color:#5e6b65;margin:4px 0 8px">M.S.I. Inter College · Est. 1908<br>Bakshipur, Gorakhpur, UP 273001</div>' +
          '<a href="' + dirUrl("") + '" target="_blank" rel="noopener" style="display:inline-block;background:#0f4433;color:#fff;padding:7px 12px;border-radius:999px;font-size:12.5px;font-weight:600;text-decoration:none">Get directions →</a></div>'
      });
      marker.addListener("click", () => iw.open({ map, anchor: marker }));
      setTimeout(() => iw.open({ map, anchor: marker }), 700);

      // Refine the campus position from Google's place data, if Geocoding is enabled.
      try {
        const r = await new g.Geocoder().geocode({ address: CAMPUS.placeQuery, region: "in" });
        const loc = r.results && r.results[0] && r.results[0].geometry.location;
        if (loc) {
          const p = { lat: loc.lat(), lng: loc.lng() };
          // Only accept a result that is plausibly the campus (within ~4 km).
          if (haversine(center, p) < 4) { center = p; marker.setPosition(p); map.setCenter(p); }
        }
      } catch (_) { /* Geocoding API not enabled — keep configured coordinates */ }

      const ds = new g.DirectionsService();
      const dr = new g.DirectionsRenderer({
        map, suppressMarkers: false, preserveViewport: false,
        polylineOptions: { strokeColor: "#0f4433", strokeWeight: 6, strokeOpacity: .85 }
      });
      let lastLine = null;

      async function route(origin, label) {
        hideInfo();
        if (lastLine) { lastLine.setMap(null); lastLine = null; }
        try {
          const res = await ds.route({ origin, destination: center, travelMode: g.TravelMode.DRIVING, region: "in" });
          dr.setMap(map); dr.setDirections(res);
          const leg = res.routes[0].legs[0];
          showInfo('<i class="fas fa-route" style="color:#c8962e"></i> <strong>' + label + '</strong> → Campus · ' +
                   leg.distance.text + ' · ~' + leg.duration.text +
                   ' · <a href="' + dirUrl(typeof origin === "string" ? origin : origin.lat + "," + origin.lng) + '" target="_blank" rel="noopener" style="color:#155a43;font-weight:600">Navigate</a>');
        } catch (_) {
          // Directions API not enabled: draw a straight line and link out.
          dr.setMap(null);
          let o = origin;
          if (typeof origin === "string") {
            try { const gr = await new g.Geocoder().geocode({ address: origin, region: "in" }); const l = gr.results[0].geometry.location; o = { lat: l.lat(), lng: l.lng() }; }
            catch (e) { window.open(dirUrl(origin), "_blank", "noopener"); return; }
          }
          lastLine = new g.Polyline({ map, path: [o, center], strokeColor: "#0f4433", strokeOpacity: 0, icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "14px" }] });
          const b = new g.LatLngBounds(); b.extend(o); b.extend(center); map.fitBounds(b, 60);
          showInfo('<strong>' + label + '</strong> → Campus · ~' + haversine(o, center).toFixed(1) + ' km (straight line) · <a href="' + dirUrl(typeof origin === "string" ? origin : o.lat + "," + o.lng) + '" target="_blank" rel="noopener" style="color:#155a43;font-weight:600">Navigate</a>');
        }
      }

      buildToolbar(
        (l) => {
          if (!l) { hideInfo(); dr.setMap(null); if (lastLine) lastLine.setMap(null); map.setCenter(center); map.setZoom(16); iw.open({ map, anchor: marker }); return; }
          iw.close(); route(l.query, l.label);
        },
        async () => {
          try { const p = await locate(); iw.close(); route(p, "Your location"); }
          catch (e) { showInfo('<i class="fas fa-circle-info"></i> ' + e.message); }
        }
      );
      shell.querySelector(".map-loading") && shell.querySelector(".map-loading").remove();
    };

    window.gm_authFailure = function () {
      // Invalid / restricted key → fall back gracefully.
      console.warn("Google Maps API key rejected — using keyless embed.");
      initEmbed();
    };

    const s = document.createElement("script");
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(KEY) +
            "&callback=__msiMapInit&loading=async&v=weekly&language=en&region=IN";
    s.async = true; s.defer = true;
    s.onerror = initEmbed;
    document.head.appendChild(s);
  }

  function haversine(a, b) {
    const R = 6371, toR = x => x * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // Load the map only when it scrolls near the viewport (saves data on mobile).
  function boot() { KEY ? initJsApi() : initEmbed(); }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); boot(); }
    }, { rootMargin: "400px" });
    io.observe(shell);
  } else boot();
})();
