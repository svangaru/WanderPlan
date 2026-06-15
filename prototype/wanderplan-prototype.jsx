import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

/* ============================================================
   WANDERPLAN — Interactive Prototype (Italy MVP)
   Globe → Wizard → AI Generation (live Claude + mock fallback)
   → Itinerary (day cards / SVG map view) · mock auth ·
   simulated scraper feed (live_events)
   ============================================================ */

/* ----------------------- "DATABASE" ----------------------- */
/* country_experiences — Italy partition (seeded) */
const ITALY_EXPERIENCES = [
  { id: "e01", category: "food", name: "Trastevere Food Tour", city: "Rome", lat: 41.889, lng: 12.469, cost: 85, hours: 3.5, pop: 9.2, desc: "Evening walking tour through Rome's most beloved food quarter — supplì, porchetta, gelato." },
  { id: "e02", category: "food", name: "Fresh Pasta Workshop", city: "Bologna", lat: 44.494, lng: 11.343, cost: 70, hours: 3, pop: 9.0, desc: "Hand-roll tagliatelle and tortellini with a sfoglina in the food capital of Italy." },
  { id: "e03", category: "food", name: "Truffle Hunting in Alba", city: "Alba", lat: 44.7, lng: 8.035, cost: 140, hours: 4, pop: 8.7, desc: "Hunt white truffles with a trifolau and his dog, then a tasting lunch in the Langhe hills." },
  { id: "e04", category: "food", name: "Naples Pizza Pilgrimage", city: "Naples", lat: 40.851, lng: 14.268, cost: 35, hours: 2.5, pop: 9.5, desc: "The originals: Da Michele, Sorbillo, and wood-fired margherita where pizza was born." },
  { id: "e05", category: "food", name: "Chianti Wine Estate Tasting", city: "Siena", lat: 43.318, lng: 11.33, cost: 95, hours: 5, pop: 8.9, desc: "Drive the SR222 through vineyards, tasting Chianti Classico at two family estates." },
  { id: "e06", category: "food_festival", name: "Palermo Street Food Crawl", city: "Palermo", lat: 38.116, lng: 13.361, cost: 45, hours: 3, pop: 8.8, desc: "Arancine, panelle, and sfincione through the Ballarò and Vucciria markets." },
  { id: "e07", category: "hike", name: "Cinque Terre Coastal Trail", city: "Cinque Terre", lat: 44.127, lng: 9.71, cost: 8, hours: 5, pop: 9.4, desc: "The Sentiero Azzurro between five pastel villages clinging to the Ligurian cliffs." },
  { id: "e08", category: "hike", name: "Tre Cime di Lavaredo Loop", city: "Dolomites", lat: 46.618, lng: 12.302, cost: 30, hours: 4, pop: 9.6, desc: "The most iconic hike in the Dolomites — a 10km loop around three colossal peaks." },
  { id: "e09", category: "nature", name: "Saturnia Hot Springs", city: "Saturnia", lat: 42.649, lng: 11.512, cost: 0, hours: 3, pop: 8.5, desc: "Free cascading thermal pools in the Tuscan Maremma. Go at sunrise." },
  { id: "e10", category: "hike", name: "Path of the Gods", city: "Amalfi", lat: 40.634, lng: 14.602, cost: 0, hours: 4, pop: 9.3, desc: "Cliffside trail from Bomerano to Nocelle, suspended above the Amalfi Coast." },
  { id: "e11", category: "scenic", name: "Lake Como Villa Circuit", city: "Como", lat: 45.985, lng: 9.257, cost: 40, hours: 6, pop: 9.0, desc: "Ferry-hop between Bellagio, Varenna, and Villa del Balbianello's gardens." },
  { id: "e12", category: "city", name: "Colosseum & Roman Forum", city: "Rome", lat: 41.89, lng: 12.492, cost: 18, hours: 4, pop: 9.7, desc: "Underground-and-arena access tour of the ancient heart of the empire." },
  { id: "e13", category: "city", name: "Uffizi Gallery", city: "Florence", lat: 43.768, lng: 11.255, cost: 26, hours: 3, pop: 9.5, desc: "Botticelli, Caravaggio, da Vinci — the Renaissance under one roof." },
  { id: "e14", category: "city", name: "Venice: San Marco & Gondola", city: "Venice", lat: 45.434, lng: 12.339, cost: 95, hours: 4, pop: 9.1, desc: "Basilica mosaics, Doge's Palace, and a back-canal gondola at golden hour." },
  { id: "e15", category: "city", name: "Pompeii with Archaeologist", city: "Naples", lat: 40.749, lng: 14.485, cost: 55, hours: 4, pop: 9.4, desc: "The frozen Roman city, guided by a working archaeologist. Vesuvius add-on." },
  { id: "e16", category: "concert", name: "Opera at Arena di Verona", city: "Verona", lat: 45.439, lng: 10.994, cost: 60, hours: 4, pop: 9.2, desc: "Aida under the stars in a 2,000-year-old Roman amphitheatre." },
  { id: "e17", category: "music", name: "Umbria Jazz Evening", city: "Perugia", lat: 43.112, lng: 12.389, cost: 40, hours: 4, pop: 8.6, desc: "Europe's great jazz festival takes over Perugia's medieval streets each July." },
  { id: "e18", category: "concert", name: "Teatro San Carlo Performance", city: "Naples", lat: 40.837, lng: 14.249, cost: 50, hours: 3, pop: 8.4, desc: "Europe's oldest working opera house, gilded and gorgeous." },
  { id: "e19", category: "beach", name: "Positano Beach Day", city: "Amalfi", lat: 40.628, lng: 14.485, cost: 30, hours: 5, pop: 8.9, desc: "Spiaggia Grande sunbeds, cliff-jumping at Fornillo, Aperol at sunset." },
  { id: "e20", category: "swimming", name: "Capri Blue Grotto Swim", city: "Capri", lat: 40.561, lng: 14.205, cost: 75, hours: 6, pop: 9.0, desc: "Boat circuit of the island with a swim stop in electric-blue sea caves." },
  { id: "e21", category: "beach", name: "San Vito Lo Capo", city: "Sicily", lat: 38.174, lng: 12.735, cost: 15, hours: 6, pop: 8.7, desc: "Caribbean-clear water beneath Monte Monaco on Sicily's northwest tip." },
  { id: "e22", category: "nightlife", name: "Navigli Aperitivo Crawl", city: "Milan", lat: 45.452, lng: 9.176, cost: 35, hours: 3, pop: 8.3, desc: "Canal-side spritz culture — pay for a drink, eat the buffet." },
  { id: "e23", category: "photography", name: "Val d'Orcia at Dawn", city: "Siena", lat: 43.06, lng: 11.69, cost: 0, hours: 3, pop: 9.1, desc: "Cypress lanes, rolling wheat, morning fog — Tuscany's most photographed valley." },
  { id: "e24", category: "wellness", name: "Tuscan Thermal Spa", city: "Montecatini", lat: 43.88, lng: 10.77, cost: 65, hours: 4, pop: 8.0, desc: "Art-nouveau terme: thermal pools, steam grottoes, and a very long lunch after." },
];

/* live_events — simulated scraper output (Eventbrite / RA / tourism boards) */
const LIVE_EVENTS = [
  { id: "ev1", name: "Calcio Storico Final", city: "Florence", start: "2026-06-24", end: "2026-06-24", category: "event", cost: 30, source: "tourism-board:firenze", url: "#", desc: "Renaissance-costume historic football in Piazza Santa Croce." },
  { id: "ev2", name: "Arena di Verona Opera Festival", city: "Verona", start: "2026-06-12", end: "2026-09-05", category: "concert", cost: 60, source: "eventbrite", url: "#", desc: "Nightly opera in the Roman arena all summer." },
  { id: "ev3", name: "Luminara di San Ranieri", city: "Pisa", start: "2026-06-16", end: "2026-06-16", category: "event", cost: 0, source: "tourism-board:pisa", url: "#", desc: "70,000 candles light the Arno riverfront for one night." },
  { id: "ev4", name: "Umbria Jazz Festival", city: "Perugia", start: "2026-07-10", end: "2026-07-19", category: "music", cost: 40, source: "residentadvisor", url: "#", desc: "Ten days of jazz across Perugia's old town." },
  { id: "ev5", name: "Ravello Festival Opening", city: "Amalfi", start: "2026-06-28", end: "2026-08-30", category: "concert", cost: 45, source: "eventbrite", url: "#", desc: "Symphonies on a terrace 350m above the Tyrrhenian Sea." },
  { id: "ev6", name: "Taormina Film Fest", city: "Sicily", start: "2026-06-13", end: "2026-06-19", category: "event", cost: 25, source: "eventbrite", url: "#", desc: "Screenings in the ancient Greek theatre with Etna behind the screen." },
];

const SCRAPED_AT = "2026-06-11T04:00:11Z";

/* globe countries */
const GLOBE_COUNTRIES = [
  { code: "IT", name: "Italy", lat: 42.8, lng: 12.5, active: true },
  { code: "FR", name: "France", lat: 46.6, lng: 2.4, active: false },
  { code: "ES", name: "Spain", lat: 40.3, lng: -3.7, active: false },
  { code: "GR", name: "Greece", lat: 39.0, lng: 22.0, active: false },
  { code: "PT", name: "Portugal", lat: 39.5, lng: -8.0, active: false },
  { code: "HR", name: "Croatia", lat: 45.1, lng: 15.2, active: false },
  { code: "MA", name: "Morocco", lat: 31.8, lng: -7.1, active: false },
  { code: "IS", name: "Iceland", lat: 64.9, lng: -18.6, active: false },
  { code: "JP", name: "Japan", lat: 36.2, lng: 138.3, active: false },
  { code: "TH", name: "Thailand", lat: 15.9, lng: 101.0, active: false },
  { code: "PE", name: "Peru", lat: -9.2, lng: -75.0, active: false },
  { code: "MX", name: "Mexico", lat: 23.6, lng: -102.5, active: false },
];

const CAT_TO_PREF = {
  food: "food", food_festival: "food",
  nature: "nature", hike: "nature", waterfall: "nature", scenic: "nature",
  city: "city", event: "city",
  music: "music", concert: "music",
  beach: "beach", swimming: "beach",
  cultural: "culture", spiritual: "culture",
  adventure: "adventure", wellness: "wellness", nightlife: "nightlife",
  photography: "photography", wildlife: "wildlife",
};

const SLIDER_GROUPS = [
  {
    label: "Experiences", color: "#34D399",
    sliders: [
      { key: "food", icon: "🍜", label: "Food & Food Festivals" },
      { key: "nature", icon: "🏔️", label: "Nature, Hikes & Waterfalls" },
      { key: "city", icon: "🏛️", label: "City Life & Local Events" },
      { key: "music", icon: "🎵", label: "Music & Concerts" },
      { key: "beach", icon: "🏖️", label: "Beaches & Swimming" },
      { key: "culture", icon: "🎭", label: "Culture & Museums" },
      { key: "nightlife", icon: "🌙", label: "Nightlife & Aperitivo" },
      { key: "wellness", icon: "🧘", label: "Wellness & Thermal Spas" },
      { key: "photography", icon: "📸", label: "Photography Spots" },
      { key: "adventure", icon: "🪂", label: "Adventure" },
    ],
  },
  {
    label: "Pace & Style", color: "#60A5FA",
    sliders: [
      { key: "pace", icon: "⚡", label: "Trip Pace", ends: ["Relaxed", "Packed"] },
      { key: "local", icon: "🗺️", label: "Discovery Style", ends: ["Hotspots", "Hidden gems"] },
    ],
  },
  {
    label: "Practical", color: "#F5A623",
    sliders: [
      { key: "minCost", icon: "💸", label: "Budget Sensitivity", ends: ["Splurge", "Save"] },
      { key: "minFlights", icon: "🚆", label: "Flight Aversion", ends: ["Fly freely", "Trains only"] },
    ],
  },
  {
    label: "Accommodation", color: "#C084FC",
    sliders: [
      { key: "accomStyle", icon: "🏨", label: "Accommodation Style", ends: ["Backpacker", "Luxury"] },
      { key: "accomType", icon: "🏠", label: "Stay Type", ends: ["Hotels", "Local stays"] },
    ],
  },
];

const DEFAULT_PREFS = {
  food: 70, nature: 60, city: 65, music: 40, beach: 50, culture: 55,
  nightlife: 35, wellness: 25, photography: 45, adventure: 30,
  pace: 55, local: 50, minCost: 50, minFlights: 70, accomStyle: 50, accomType: 50,
};

/* ----------------------- helpers ----------------------- */
const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
const overlap = (d, s, e) => d >= s && d <= e;

/* lat/lng → 3D */
function latLngToVec3(lat, lng, r) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

/* ----------------------- MOCK GENERATOR ----------------------- */
function mockGenerate(trip, prefs) {
  const totalDays = daysBetween(trip.startDate, trip.endDate);
  const styleMult = prefs.accomStyle > 66 ? 1.6 : prefs.accomStyle < 33 ? 0.6 : 1;
  const costMult = (1.3 - prefs.minCost / 200) * styleMult;

  // score experiences by prefs
  const scored = ITALY_EXPERIENCES.map((e) => {
    const w = (prefs[CAT_TO_PREF[e.category]] ?? 40) / 100;
    const localBoost = prefs.local > 60 && e.pop < 8.8 ? 1.2 : 1;
    return { ...e, score: w * e.pop * localBoost };
  }).sort((a, b) => b.score - a.score);

  // pick cities by aggregate score
  const cityScores = {};
  scored.forEach((e) => { cityScores[e.city] = (cityScores[e.city] || 0) + e.score; });
  const paceCities = prefs.pace > 60 ? 3.0 : prefs.pace < 35 ? 2.0 : 2.5;
  const numCities = Math.max(1, Math.min(6, Math.round(totalDays / paceCities)));
  let cities = Object.entries(cityScores).sort((a, b) => b[1] - a[1]).slice(0, numCities).map(([c]) => c);

  // geographic ordering north→south (or reversed if start city is southern)
  const cityLat = {}; ITALY_EXPERIENCES.forEach((e) => { if (!(e.city in cityLat)) cityLat[e.city] = e.lat; });
  cities.sort((a, b) => cityLat[b] - cityLat[a]);
  const startLower = (trip.startCity || "").toLowerCase();
  if (["naples", "palermo", "sicily", "amalfi", "bari"].some((s) => startLower.includes(s))) cities.reverse();

  // allocate days per city
  const base = Math.floor(totalDays / cities.length);
  const extra = totalDays - base * cities.length;
  const alloc = cities.map((c, i) => ({ city: c, days: base + (i < extra ? 1 : 0) }));

  const used = new Set();
  const pickFor = (city, slot) => {
    const pool = scored.filter((e) => e.city === city && !used.has(e.id));
    let pick =
      slot === "evening"
        ? pool.find((e) => ["nightlife", "music", "concert", "food", "food_festival"].includes(e.category)) || pool[0]
        : pool[0];
    if (!pick) {
      const any = scored.filter((e) => !used.has(e.id))[0];
      pick = any || scored[0];
    }
    used.add(pick.id);
    return pick;
  };

  const days = [];
  let dayNum = 1;
  alloc.forEach((a, ci) => {
    for (let i = 0; i < a.days; i++) {
      const date = addDays(trip.startDate, dayNum - 1);
      const morning = pickFor(a.city, "morning");
      const afternoon = pickFor(a.city, "afternoon");
      const evening = pickFor(a.city, "evening");
      const ev = LIVE_EVENTS.find((e) => e.city === a.city && overlap(date, e.start, e.end));
      const transport =
        i === 0 && ci > 0
          ? { mode: prefs.minFlights > 50 ? "train" : "train", duration: "1.5–3h", cost_usd: Math.round(35 * costMult), booking_note: "Trenitalia / Italo — book Frecciarossa 1–2 weeks ahead for best fares." }
          : null;
      const accomBase = prefs.accomStyle > 66 ? 220 : prefs.accomStyle < 33 ? 45 : 110;
      const accomType = prefs.accomType > 55 ? (prefs.accomStyle < 40 ? "guesthouse" : "airbnb") : prefs.accomStyle < 33 ? "hostel" : "hotel";
      const slotCost = (e) => Math.round(e.cost * costMult);
      days.push({
        day_number: dayNum,
        date,
        country: "Italy",
        city: a.city,
        day_theme: `${morning.category === "hike" ? "Trails & " : ""}${a.city} — ${morning.name.split(" ").slice(0, 3).join(" ")}`,
        morning: { activity: morning.name, location: morning.city, duration_hours: morning.hours, cost_usd: slotCost(morning), tips: morning.desc },
        afternoon: { activity: afternoon.name, location: afternoon.city, duration_hours: afternoon.hours, cost_usd: slotCost(afternoon), tips: afternoon.desc },
        evening: { activity: ev && evening.category !== "concert" ? ev.name : evening.name, location: a.city, duration_hours: 3, cost_usd: ev ? ev.cost : slotCost(evening), tips: ev ? ev.desc : evening.desc },
        transport_from_previous: transport,
        accommodation: { type: accomType, name: `${a.city} ${accomType === "airbnb" ? "apartment" : accomType}`, area: "old town / centro storico", est_cost_per_night_usd: Math.round(accomBase * costMult) },
        daily_total_cost_usd: Math.round((slotCost(morning) + slotCost(afternoon) + (ev ? ev.cost : slotCost(evening)) + accomBase * costMult + 45 * costMult)),
        local_tip: ["Cappuccino is a before-11am drink — order espresso after meals.", "Validate regional train tickets in the green machines before boarding.", "Museums are free the first Sunday of each month.", "Riposo: many shops close 1–4pm — plan lunches long.", "Tap water from nasoni fountains is excellent and free.", "Dinner before 7:30pm marks you as a tourist — book 8:30+."][dayNum % 6],
        event_highlight: ev ? { name: ev.name, url: ev.url, source: ev.source } : null,
        _eventId: ev ? ev.id : null,
      });
      dayNum++;
    }
  });
  return days;
}

/* ----------------------- LIVE CLAUDE GENERATOR ----------------------- */
async function claudeGenerateChunk(trip, prefs, dayStart, dayEnd, priorCities) {
  const eventsCtx = LIVE_EVENTS.filter((e) => e.end >= trip.startDate && e.start <= trip.endDate);
  const dbCtx = ITALY_EXPERIENCES.map((e) => ({ name: e.name, city: e.city, category: e.category, cost_usd: e.cost, hours: e.hours, popularity: e.pop }));
  const prompt = `You are WanderPlan's travel curator. Generate days ${dayStart}–${dayEnd} of a ${daysBetween(trip.startDate, trip.endDate)}-day Italy trip.

TRIP: ${trip.startDate} to ${trip.endDate}. Start city: ${trip.startCity || "Rome"}. End city: ${trip.endCity || trip.startCity || "Rome"}. Group: ${trip.groupSize} (${trip.groupType}). Budget/day/person: $${trip.budget}.
${priorCities.length ? `Cities already covered on earlier days (continue the route logically, no backtracking): ${priorCities.join(" → ")}.` : ""}
PREFERENCES (0–100): food=${prefs.food} nature=${prefs.nature} city=${prefs.city} music=${prefs.music} beach=${prefs.beach} culture=${prefs.culture} nightlife=${prefs.nightlife} wellness=${prefs.wellness} photography=${prefs.photography} pace=${prefs.pace} hiddenGems=${prefs.local} budgetSensitivity=${prefs.minCost} flightAversion=${prefs.minFlights}.
DIETARY: ${trip.dietary.join(", ") || "none"}. MOBILITY NEEDS: ${trip.mobility ? "yes — avoid strenuous hikes/stairs" : "no"}.

DATABASE (country_experiences, Italy partition): ${JSON.stringify(dbCtx)}
LIVE EVENTS (scraped, during trip): ${JSON.stringify(eventsCtx.map((e) => ({ name: e.name, city: e.city, start: e.start, end: e.end, cost: e.cost })))}

Respond with ONLY a raw JSON array (no markdown, no prose) of ${dayEnd - dayStart + 1} day objects:
[{"day_number":${dayStart},"date":"YYYY-MM-DD","country":"Italy","city":"...","day_theme":"...","morning":{"activity":"...","location":"...","duration_hours":3,"cost_usd":0,"tips":"..."},"afternoon":{...},"evening":{...},"transport_from_previous":null or {"mode":"train","duration":"2h","cost_usd":35,"booking_note":"..."},"accommodation":{"type":"hotel","name":"...","area":"...","est_cost_per_night_usd":0},"daily_total_cost_usd":0,"local_tip":"...","event_highlight":null or {"name":"...","url":"#"}}]
Prefer experiences from the DATABASE. Weave in a LIVE EVENT when dates+city align. Respect budget and flight aversion (Italy = trains). Dates must be sequential starting ${addDays(trip.startDate, dayStart - 1)}.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const clean = text.replace(/```json|```/g, "").trim();
  const arr = JSON.parse(clean.slice(clean.indexOf("["), clean.lastIndexOf("]") + 1));
  if (!Array.isArray(arr) || !arr.length) throw new Error("bad shape");
  return arr.map((d) => ({ ...d, _eventId: d.event_highlight ? (LIVE_EVENTS.find((e) => e.name === d.event_highlight.name) || {}).id || null : null }));
}

/* ----------------------- GLOBE ----------------------- */
function GlobeScreen({ selected, onToggle, onPlan, onToast }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000);
    camera.position.z = 300;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(100, 48, 48),
      new THREE.MeshPhongMaterial({ color: 0x0d1a33, emissive: 0x060d1c, shininess: 8 })
    );
    group.add(sphere);
    // graticule
    const grat = new THREE.Mesh(
      new THREE.SphereGeometry(100.4, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x1d3a5f, wireframe: true, transparent: true, opacity: 0.18 })
    );
    group.add(grat);
    // atmosphere
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(108, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x00e5c3, transparent: true, opacity: 0.045, side: THREE.BackSide })
    );
    group.add(atmo);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dl = new THREE.DirectionalLight(0xbfdfff, 0.9);
    dl.position.set(200, 120, 200);
    scene.add(dl);

    // stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      // uniform random direction (r128 has no Vector3.randomDirection)
      const u = Math.random() * 2 - 1; // cos(phi)
      const theta = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 500 + Math.random() * 400;
      starPos.set([s * Math.cos(theta) * r, u * r, s * Math.sin(theta) * r], i * 3);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x88aacc, size: 1.1, transparent: true, opacity: 0.7 })));

    // markers
    const markers = [];
    GLOBE_COUNTRIES.forEach((c) => {
      const mat = new THREE.MeshBasicMaterial({ color: c.active ? 0x00e5c3 : 0x39557a });
      const m = new THREE.Mesh(new THREE.SphereGeometry(c.active ? 3.4 : 2.2, 16, 16), mat);
      m.position.copy(latLngToVec3(c.lat, c.lng, 102));
      m.userData = c;
      group.add(m);
      if (c.active) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(4.5, 5.5, 32),
          new THREE.MeshBasicMaterial({ color: 0x00e5c3, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
        );
        ring.position.copy(m.position.clone().multiplyScalar(1.01));
        ring.lookAt(m.position.clone().multiplyScalar(2));
        group.add(ring);
        m.userData.ring = ring;
      }
      markers.push(m);
    });

    // point Europe at camera initially
    group.rotation.y = -2.1;
    group.rotation.x = 0.45;

    const st = stateRef.current;
    st.dragging = false; st.px = 0; st.py = 0; st.vy = 0.0016; st.moved = 0;

    const onDown = (e) => { st.dragging = true; st.moved = 0; st.px = e.clientX ?? e.touches?.[0]?.clientX; st.py = e.clientY ?? e.touches?.[0]?.clientY; };
    const onMove = (e) => {
      if (!st.dragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX, y = e.clientY ?? e.touches?.[0]?.clientY;
      const dx = x - st.px, dy = y - st.py;
      st.moved += Math.abs(dx) + Math.abs(dy);
      group.rotation.y += dx * 0.005;
      group.rotation.x = Math.max(-1.2, Math.min(1.2, group.rotation.x + dy * 0.003));
      st.px = x; st.py = y;
    };
    const onUp = () => { st.dragging = false; };
    const ray = new THREE.Raycaster();
    const onClick = (e) => {
      if (st.moved > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(markers);
      if (hits.length) {
        const c = hits[0].object.userData;
        if (c.active) onToggle(c.code);
        else onToast(`${c.name} — coming in Phase 2. Italy is live!`);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("click", onClick);

    let raf, t = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.02;
      if (!st.dragging) group.rotation.y += st.vy;
      markers.forEach((m) => {
        if (m.userData.active) {
          const s = 1 + Math.sin(t * 2) * 0.25;
          m.scale.setScalar(s);
          if (m.userData.ring) m.userData.ring.material.opacity = 0.35 + Math.sin(t * 2) * 0.25;
        }
      });
      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none">
        <h1 className="wp-display text-4xl md:text-5xl text-white tracking-tight">
          Wander<span style={{ color: "#00E5C3" }}>Plan</span>
        </h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base max-w-md">
          Spin the globe. Pick up to 5 countries. We'll build the trip around what you actually love.
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col items-center gap-3">
        <div className="flex gap-2 flex-wrap justify-center">
          {selected.map((code) => {
            const c = GLOBE_COUNTRIES.find((g) => g.code === code);
            return (
              <button key={code} onClick={() => onToggle(code)}
                className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                style={{ background: "rgba(0,229,195,0.12)", borderColor: "#00E5C3", color: "#00E5C3" }}>
                {c.name} ✕
              </button>
            );
          })}
          {!selected.length && <span className="text-slate-500 text-sm">Tap the glowing marker — Italy is seeded in this prototype</span>}
        </div>
        <button disabled={!selected.length} onClick={onPlan}
          className="px-8 py-3 rounded-full font-semibold text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
          style={{ background: "#00E5C3", color: "#06281f", boxShadow: selected.length ? "0 0 40px rgba(0,229,195,0.35)" : "none" }}>
          Plan This Trip →
        </button>
      </div>
    </div>
  );
}

/* ----------------------- MINI GLOBE BADGE ----------------------- */
function MiniGlobe({ onClick }) {
  return (
    <button onClick={onClick} title="Back to globe"
      className="relative w-10 h-10 rounded-full border border-slate-700 hover:border-teal-400 transition-colors flex items-center justify-center"
      style={{ background: "radial-gradient(circle at 35% 35%, #16294a, #0a0f1e)" }}>
      <span className="absolute w-2 h-2 rounded-full animate-pulse" style={{ background: "#00E5C3", top: "30%", left: "52%" }} />
      <span className="text-[9px] text-slate-500 absolute -bottom-4">IT</span>
    </button>
  );
}

/* ----------------------- SLIDER ----------------------- */
function PrefSlider({ def, value, color, onChange }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-sm text-slate-300">
          <span className="mr-1.5">{def.icon}</span>{def.label}
        </label>
        <span className="text-xs font-mono" style={{ color }}>{value}</span>
      </div>
      <input type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="wp-slider w-full" style={{ "--c": color, "--p": `${value}%` }} />
      {def.ends && (
        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
          <span>{def.ends[0]}</span><span>{def.ends[1]}</span>
        </div>
      )}
    </div>
  );
}

/* ----------------------- WIZARD ----------------------- */
function Wizard({ trip, setTrip, prefs, setPrefs, user, onRequestAuth, onGenerate, onBack }) {
  const [step, setStep] = useState(0);
  const steps = ["Dates & Route", "Travelers", "Preferences", "Budget", "Review"];
  const totalDays = daysBetween(trip.startDate, trip.endDate);
  const valid = [
    totalDays >= 3 && totalDays <= 365 && trip.startCity.trim(),
    trip.groupSize >= 1,
    true,
    trip.budget >= 20,
    true,
  ][step];

  const field = "w-full bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none";

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-slate-400 text-sm hover:text-teal-300">← Globe</button>
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className="h-1.5 rounded-full transition-all"
              style={{ width: i === step ? 28 : 14, background: i <= step ? "#00E5C3" : "#1e293b" }} />
          ))}
        </div>
        <MiniGlobe onClick={onBack} />
      </div>

      <h2 className="wp-display text-2xl text-white mb-1">{steps[step]}</h2>
      <p className="text-slate-500 text-sm mb-5">
        {["Italy · when and where does it start?", "Who's coming?", "Slide what matters to you — this drives the AI.", "What's the daily damage you're comfortable with?", "One last look before we generate."][step]}
      </p>

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Start date</label>
              <input type="date" className={field} value={trip.startDate} onChange={(e) => setTrip({ ...trip, startDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">End date</label>
              <input type="date" className={field} value={trip.endDate} onChange={(e) => setTrip({ ...trip, endDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Start city</label>
              <input className={field} placeholder="e.g. Rome, Milan, Naples" value={trip.startCity} onChange={(e) => setTrip({ ...trip, startCity: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">End city</label>
              <input className={field} placeholder="Same as start" disabled={trip.returnTrip} value={trip.returnTrip ? trip.startCity : trip.endCity} onChange={(e) => setTrip({ ...trip, endCity: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={trip.returnTrip} onChange={(e) => setTrip({ ...trip, returnTrip: e.target.checked })} className="accent-teal-400" />
            Return trip (end where I start)
          </label>
          <div className="text-sm rounded-lg px-3 py-2.5 border" style={{ borderColor: "rgba(0,229,195,0.3)", background: "rgba(0,229,195,0.06)", color: "#7df0dc" }}>
            {totalDays >= 3 ? `${totalDays}-day trip · ${fmtDate(trip.startDate)} → ${fmtDate(trip.endDate)}` : "Trips need at least 3 days"}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Travelers: {trip.groupSize}</label>
            <input type="range" min={1} max={12} value={trip.groupSize} onChange={(e) => setTrip({ ...trip, groupSize: Number(e.target.value) })} className="wp-slider w-full" style={{ "--c": "#00E5C3", "--p": `${(trip.groupSize / 12) * 100}%` }} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-2">Group type</label>
            <div className="flex gap-2 flex-wrap">
              {["Solo", "Couple", "Friends", "Family with kids"].map((g) => (
                <button key={g} onClick={() => setTrip({ ...trip, groupType: g })}
                  className="px-3.5 py-2 rounded-lg text-sm border transition-all"
                  style={trip.groupType === g ? { borderColor: "#00E5C3", color: "#00E5C3", background: "rgba(0,229,195,0.08)" } : { borderColor: "#334155", color: "#94a3b8" }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-2">Dietary restrictions</label>
            <div className="flex gap-2 flex-wrap">
              {["Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "None"].map((d) => {
                const on = d === "None" ? !trip.dietary.length : trip.dietary.includes(d);
                return (
                  <button key={d} onClick={() => {
                    if (d === "None") setTrip({ ...trip, dietary: [] });
                    else setTrip({ ...trip, dietary: on ? trip.dietary.filter((x) => x !== d) : [...trip.dietary, d] });
                  }}
                    className="px-3 py-1.5 rounded-full text-xs border transition-all"
                    style={on ? { borderColor: "#34D399", color: "#34D399", background: "rgba(52,211,153,0.08)" } : { borderColor: "#334155", color: "#94a3b8" }}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={trip.mobility} onChange={(e) => setTrip({ ...trip, mobility: e.target.checked })} className="accent-teal-400" />
            Mobility / accessibility needs (we'll skip strenuous hikes & stair-heavy sites)
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-2 wp-scroll">
          {SLIDER_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                <h3 className="text-xs uppercase tracking-widest text-slate-400">{g.label}</h3>
              </div>
              {g.sliders.map((s) => (
                <PrefSlider key={s.key} def={s} color={g.color} value={prefs[s.key]} onChange={(v) => setPrefs({ ...prefs, [s.key]: v })} />
              ))}
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Daily budget per person (USD): <span className="text-amber-400 font-mono">${trip.budget}</span></label>
            <input type="range" min={30} max={600} step={10} value={trip.budget} onChange={(e) => setTrip({ ...trip, budget: Number(e.target.value) })} className="wp-slider w-full" style={{ "--c": "#F5A623", "--p": `${((trip.budget - 30) / 570) * 100}%` }} />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5"><span>$30 hostel life</span><span>$600 la dolce vita</span></div>
          </div>
          <div className="text-sm rounded-lg px-3 py-2.5 border border-amber-500/30 bg-amber-500/5 text-amber-200/80">
            Estimated trip total: <strong>${(trip.budget * totalDays * trip.groupSize).toLocaleString()}</strong> ({trip.groupSize} traveler{trip.groupSize > 1 ? "s" : ""} × {totalDays} days)
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-2 text-sm">
            <Row k="Country" v="🇮🇹 Italy" />
            <Row k="Dates" v={`${fmtDate(trip.startDate)} → ${fmtDate(trip.endDate)} (${totalDays} days)`} />
            <Row k="Route" v={`${trip.startCity || "Rome"} → ${trip.returnTrip ? trip.startCity || "Rome" : trip.endCity || "open"}`} />
            <Row k="Group" v={`${trip.groupSize} · ${trip.groupType}${trip.dietary.length ? " · " + trip.dietary.join(", ") : ""}`} />
            <Row k="Budget" v={`$${trip.budget}/day/person`} />
            <Row k="Top priorities" v={Object.entries(prefs).filter(([k]) => SLIDER_GROUPS[0].sliders.some((s) => s.key === k)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => SLIDER_GROUPS[0].sliders.find((s) => s.key === k).label).join(" · ")} />
          </div>
          {!user && (
            <div className="text-xs text-slate-400 rounded-lg border border-slate-700 px-3 py-2.5">
              🔒 Sign in to generate and save this trip (simulated auth in this prototype).
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between mt-7">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="px-5 py-2.5 rounded-full text-sm border border-slate-700 text-slate-300 disabled:opacity-30 hover:border-slate-500">
          Back
        </button>
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} disabled={!valid}
            className="px-6 py-2.5 rounded-full text-sm font-semibold disabled:opacity-30"
            style={{ background: "#00E5C3", color: "#06281f" }}>
            Continue →
          </button>
        ) : (
          <button onClick={() => (user ? onGenerate() : onRequestAuth())}
            className="px-6 py-2.5 rounded-full text-sm font-semibold hover:scale-105 transition-transform"
            style={{ background: "#00E5C3", color: "#06281f", boxShadow: "0 0 30px rgba(0,229,195,0.3)" }}>
            {user ? "✨ Generate My Itinerary" : "Sign in & Generate"}
          </button>
        )}
      </div>
    </div>
  );
}
const Row = ({ k, v }) => (
  <div className="flex justify-between gap-4">
    <span className="text-slate-500 shrink-0">{k}</span>
    <span className="text-slate-200 text-right">{v}</span>
  </div>
);

/* ----------------------- AUTH MODAL ----------------------- */
function AuthModal({ onClose, onLogin }) {
  const [email, setEmail] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(4,8,18,0.8)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 p-6" style={{ background: "linear-gradient(160deg,#0e1730,#0a0f1e)" }}>
        <h3 className="wp-display text-xl text-white mb-1">Welcome to WanderPlan</h3>
        <p className="text-slate-500 text-xs mb-5">Prototype auth — sessions are simulated, no real OAuth call is made. The repo version wires NextAuth.</p>
        <div className="space-y-2.5">
          <button onClick={() => onLogin({ name: "Traveler", email: "you@gmail.com", provider: "google" })}
            className="w-full py-2.5 rounded-lg border border-slate-600 text-slate-200 text-sm hover:border-teal-400 transition-colors">
            Continue with Google
          </button>
          <button onClick={() => onLogin({ name: "Traveler", email: "you@github.dev", provider: "github" })}
            className="w-full py-2.5 rounded-lg border border-slate-600 text-slate-200 text-sm hover:border-teal-400 transition-colors">
            Continue with GitHub
          </button>
          <div className="flex gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
              className="flex-1 bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-teal-400 focus:outline-none" />
            <button onClick={() => email.includes("@") && onLogin({ name: email.split("@")[0], email, provider: "magic-link" })}
              className="px-3.5 rounded-lg text-sm font-medium" style={{ background: "rgba(0,229,195,0.15)", color: "#00E5C3" }}>
              Magic link
            </button>
          </div>
        </div>
        <button onClick={onClose} className="mt-4 text-xs text-slate-500 hover:text-slate-300 w-full text-center">Not now</button>
      </div>
    </div>
  );
}

/* ----------------------- GENERATING SCREEN ----------------------- */
function GeneratingScreen({ progress, mode, doneCount, total }) {
  const lines = [
    "Querying country_experiences (partition: IT)…",
    "Joining live_events scraped 04:00 UTC…",
    "Weighting experiences against your sliders…",
    "Routing cities to minimize backtracking…",
    mode === "live" ? "Claude is drafting your days…" : "Mock engine assembling days…",
  ];
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="relative w-24 h-24 mb-7">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#00E5C3", animationDuration: "1.1s" }} />
        <div className="absolute inset-3 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #16294a, #0a0f1e)" }} />
        <span className="absolute inset-0 flex items-center justify-center text-xl">🇮🇹</span>
      </div>
      <h3 className="wp-display text-2xl text-white mb-2">Building your Italy</h3>
      <p className="text-slate-400 text-sm h-5 transition-all">{lines[Math.min(lines.length - 1, Math.floor(progress * lines.length))]}</p>
      <div className="w-64 h-1.5 rounded-full bg-slate-800 mt-6 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(progress * 100)}%`, background: "linear-gradient(90deg,#00E5C3,#34D399)" }} />
      </div>
      <p className="text-[11px] text-slate-600 mt-2 font-mono">{doneCount}/{total} days · engine: {mode === "live" ? "claude-sonnet-4 (live)" : "mock fallback"}</p>
    </div>
  );
}

/* ----------------------- ITALY SVG MAP ----------------------- */
const MAINLAND = [[7.5,43.85],[7.0,44.25],[7.6,45.1],[6.8,45.85],[7.85,45.92],[8.45,46.45],[9.3,46.5],[10.1,46.6],[11.1,46.95],[12.15,47.08],[13.5,46.55],[13.7,45.6],[13.1,45.65],[12.45,45.45],[12.25,45.2],[12.5,44.85],[12.25,44.7],[12.4,44.2],[13.55,43.6],[14.0,42.65],[14.85,42.05],[15.15,41.93],[16.0,41.95],[16.2,41.7],[15.9,41.5],[17.3,40.9],[18.0,40.65],[18.5,40.1],[18.35,39.8],[17.9,40.25],[17.2,40.45],[16.85,40.4],[16.6,40.1],[16.55,39.6],[17.1,39.0],[16.55,38.7],[16.55,38.4],[16.05,37.92],[15.65,38.0],[15.65,38.25],[15.85,38.65],[16.2,38.95],[15.95,39.4],[15.7,39.95],[15.25,40.0],[14.9,40.25],[14.75,40.65],[14.45,40.6],[14.05,40.8],[13.7,41.25],[13.1,41.25],[12.6,41.45],[11.75,42.1],[11.1,42.4],[10.7,42.95],[10.5,43.3],[10.25,43.85],[9.85,44.05],[9.2,44.32],[8.75,44.42],[8.15,43.95],[7.5,43.85]];
const SICILY = [[12.45,37.8],[13.3,38.2],[14.5,38.05],[15.1,38.15],[15.55,38.0],[15.1,37.35],[15.3,37.1],[15.1,36.66],[14.3,36.78],[12.9,37.58],[12.45,37.8]];
const SARDINIA = [[8.2,40.9],[8.5,40.85],[9.2,41.25],[9.55,41.15],[9.65,40.5],[9.75,40.0],[9.65,39.18],[9.05,39.05],[8.4,38.95],[8.35,39.75],[8.4,40.3],[8.2,40.9]];
const PRJ = (lon, lat) => [((lon - 6.4) / (18.8 - 6.4)) * 340 + 10, ((47.3 - lat) / (47.3 - 36.4)) * 480 + 10];
const poly = (pts) => "M" + pts.map(([lo, la]) => PRJ(lo, la).map((n) => n.toFixed(1)).join(",")).join("L") + "Z";

function ItalyMap({ days }) {
  const stops = useMemo(() => {
    const seen = [];
    days.forEach((d) => {
      const exp = ITALY_EXPERIENCES.find((e) => e.city === d.city);
      const lat = exp ? exp.lat : 41.9, lng = exp ? exp.lng : 12.5;
      const last = seen[seen.length - 1];
      if (!last || last.city !== d.city) seen.push({ city: d.city, lat, lng, firstDay: d.day_number, lastDay: d.day_number });
      else last.lastDay = d.day_number;
    });
    return seen;
  }, [days]);

  const pathD = stops.length > 1 ? "M" + stops.map((s) => PRJ(s.lng, s.lat).map((n) => n.toFixed(1)).join(",")).join("L") : "";

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 360 500" className="w-full max-w-sm">
        <defs>
          <linearGradient id="routeG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00E5C3" /><stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        {[MAINLAND, SICILY, SARDINIA].map((p, i) => (
          <path key={i} d={poly(p)} fill="#13213d" stroke="#27406b" strokeWidth="1" />
        ))}
        {pathD && (
          <path d={pathD} fill="none" stroke="url(#routeG)" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" className="wp-route" />
        )}
        {stops.map((s, i) => {
          const [x, y] = PRJ(s.lng, s.lat);
          return (
            <g key={s.city + i}>
              <circle cx={x} cy={y} r="9" fill="#0A0F1E" stroke="#00E5C3" strokeWidth="1.5" />
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fill="#00E5C3" fontWeight="700">{i + 1}</text>
              <text x={x + 13} y={y + 3.5} fontSize="10" fill="#cbd5e1">{s.city}</text>
              <text x={x + 13} y={y + 14} fontSize="8" fill="#64748b">Day {s.firstDay}{s.lastDay !== s.firstDay ? `–${s.lastDay}` : ""}</text>
            </g>
          );
        })}
        <text x="14" y="490" fontSize="8" fill="#475569" fontFamily="monospace">🚆 route follows flight-aversion = trains · Mapbox swap-in lands in the repo build</text>
      </svg>
    </div>
  );
}

/* ----------------------- DAY CARD ----------------------- */
function DayCard({ day, locked, onLock, onRegen, regenLoading }) {
  const slot = (label, s) => (
    <div className="flex gap-3 py-2 border-t border-slate-800/70 first:border-0">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 w-16 shrink-0 pt-0.5">{label}</span>
      <div className="min-w-0">
        <p className="text-sm text-slate-100 font-medium">{s.activity} <span className="text-slate-500 font-normal">· ${s.cost_usd} · {s.duration_hours}h</span></p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.tips}</p>
      </div>
    </div>
  );
  return (
    <div className="rounded-2xl border p-4 transition-all relative overflow-hidden"
      style={{ borderColor: locked ? "rgba(0,229,195,0.5)" : "#1e293b", background: "linear-gradient(165deg, rgba(20,32,60,0.6), rgba(10,15,30,0.85))", backdropFilter: "blur(10px)" }}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="wp-display text-teal-300 text-lg">Day {day.day_number}</span>
            <span className="text-xs text-slate-500">{fmtDate(day.date)}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">📍 {day.city}</span>
            {day.event_highlight && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.4)" }}>
                ⚡ LIVE EVENT
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{day.day_theme}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onLock} title={locked ? "Unlock day" : "Lock day"}
            className="w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-colors"
            style={locked ? { borderColor: "#00E5C3", color: "#00E5C3" } : { borderColor: "#334155", color: "#64748b" }}>
            {locked ? "🔒" : "🔓"}
          </button>
          <button onClick={onRegen} disabled={locked || regenLoading} title="Regenerate this day"
            className="w-8 h-8 rounded-lg border border-slate-700 text-slate-400 text-sm flex items-center justify-center hover:border-teal-400 hover:text-teal-300 disabled:opacity-30 transition-colors">
            {regenLoading ? <span className="animate-spin inline-block">↻</span> : "↻"}
          </button>
        </div>
      </div>

      {day.transport_from_previous && (
        <div className="text-xs rounded-lg px-3 py-2 mb-2 mt-2 border border-blue-500/25 bg-blue-500/5 text-blue-200/80">
          🚆 {day.transport_from_previous.mode} · {day.transport_from_previous.duration} · ${day.transport_from_previous.cost_usd} — {day.transport_from_previous.booking_note}
        </div>
      )}

      {slot("Morning", day.morning)}
      {slot("Afternoon", day.afternoon)}
      {slot("Evening", day.evening)}

      {day.event_highlight && (
        <div className="text-xs rounded-lg px-3 py-2 mt-2 border border-amber-500/30 bg-amber-500/5 text-amber-200/90">
          ⚡ <strong>{day.event_highlight.name}</strong>{day.event_highlight.source ? <span className="text-amber-500/60 font-mono"> · scraped:{day.event_highlight.source}</span> : null}
        </div>
      )}

      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-800/70 text-xs">
        <span className="text-slate-400">🏨 {day.accommodation.type} · {day.accommodation.area} · ${day.accommodation.est_cost_per_night_usd}/nt
          <button className="ml-2 text-teal-400/80 hover:text-teal-300 underline decoration-dotted">book ↗</button>
        </span>
        <span className="font-mono text-amber-300">${day.daily_total_cost_usd}/day</span>
      </div>
      <p className="text-[11px] text-slate-500 mt-2 italic">💡 {day.local_tip}</p>
    </div>
  );
}

/* ----------------------- ITINERARY SCREEN ----------------------- */
function ItineraryScreen({ days, trip, user, engine, locks, setLocks, onRegenDay, regenIdx, onBackToWizard, onBackToGlobe, events }) {
  const [view, setView] = useState("days");
  const [showEvents, setShowEvents] = useState(false);
  const total = days.reduce((s, d) => s + (d.daily_total_cost_usd || 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBackToWizard} className="text-slate-400 text-sm hover:text-teal-300">← Edit prefs</button>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowEvents(!showEvents)} className="text-xs px-3 py-1.5 rounded-full border border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
            ⚡ live_events ({events.length})
          </button>
          <MiniGlobe onClick={onBackToGlobe} />
        </div>
      </div>

      <div className="mb-5">
        <h2 className="wp-display text-3xl text-white">Italy, your way</h2>
        <p className="text-slate-400 text-sm mt-1">
          {fmtDate(trip.startDate)} → {fmtDate(trip.endDate)} · {days.length} days · {trip.groupSize} traveler{trip.groupSize > 1 ? "s" : ""} ·
          est. <span className="text-amber-300 font-mono">${total.toLocaleString()}</span>/person
        </p>
        <p className="text-[11px] text-slate-600 font-mono mt-1">
          engine: {engine === "live" ? "claude-sonnet-4 (live API)" : "mock generator (preference-weighted)"} · saved to {user?.email}
        </p>
      </div>

      {showEvents && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 mb-5">
          <p className="text-[10px] font-mono text-amber-500/70 mb-2">live_events · partition IT · scraped_at {SCRAPED_AT} · sources: eventbrite, residentadvisor, tourism-boards · redis ttl 24h</p>
          <div className="space-y-1.5">
            {events.map((e) => (
              <div key={e.id} className="flex justify-between gap-3 text-xs">
                <span className="text-amber-100">{e.name} <span className="text-slate-500">· {e.city}</span></span>
                <span className="text-slate-500 font-mono shrink-0">{e.start}{e.end !== e.start ? `→${e.end}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-full border border-slate-800 w-fit mb-5" style={{ background: "rgba(10,15,30,0.8)" }}>
        {[["days", "📋 Day view"], ["map", "🗺️ Map view"]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            style={view === v ? { background: "#00E5C3", color: "#06281f" } : { color: "#94a3b8" }}>
            {l}
          </button>
        ))}
      </div>

      {view === "days" ? (
        <div className="space-y-4 pb-10">
          {days.map((d, i) => (
            <DayCard key={d.day_number} day={d} locked={locks.has(d.day_number)}
              onLock={() => { const n = new Set(locks); n.has(d.day_number) ? n.delete(d.day_number) : n.add(d.day_number); setLocks(n); }}
              onRegen={() => onRegenDay(i)} regenLoading={regenIdx === i} />
          ))}
        </div>
      ) : (
        <ItalyMap days={days} />
      )}
    </div>
  );
}

/* ----------------------- TOAST ----------------------- */
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm border border-slate-600 text-slate-100 shadow-xl"
      style={{ background: "rgba(14,23,48,0.95)", backdropFilter: "blur(8px)" }}>
      {msg}
    </div>
  );
}

/* ----------------------- APP ----------------------- */
export default function WanderPlan() {
  const [screen, setScreen] = useState("globe");
  const [selected, setSelected] = useState([]);
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [trip, setTrip] = useState({
    startDate: "2026-06-20", endDate: "2026-06-27",
    startCity: "Rome", endCity: "", returnTrip: true,
    groupSize: 2, groupType: "Friends", dietary: [], mobility: false, budget: 150,
  });
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [days, setDays] = useState([]);
  const [locks, setLocks] = useState(new Set());
  const [engine, setEngine] = useState("live");
  const [genProgress, setGenProgress] = useState(0);
  const [genDone, setGenDone] = useState(0);
  const [regenIdx, setRegenIdx] = useState(null);
  const pendingGen = useRef(false);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  const toggleCountry = (code) => {
    setSelected((s) => s.includes(code) ? s.filter((c) => c !== code) : s.length < 5 ? [...s, code] : (showToast("Max 5 countries"), s));
  };

  const tripEvents = useMemo(
    () => LIVE_EVENTS.filter((e) => e.end >= trip.startDate && e.start <= trip.endDate),
    [trip.startDate, trip.endDate]
  );

  const generate = async () => {
    setScreen("generating");
    setDays([]); setLocks(new Set()); setGenDone(0); setGenProgress(0.05);
    const total = daysBetween(trip.startDate, trip.endDate);
    let mode = "live";
    const acc = [];
    const CHUNK = 2;
    try {
      for (let d = 1; d <= total; d += CHUNK) {
        const end = Math.min(total, d + CHUNK - 1);
        const priorCities = [...new Set(acc.map((x) => x.city))];
        const chunk = await claudeGenerateChunk(trip, prefs, d, end, priorCities);
        acc.push(...chunk);
        setGenDone(acc.length);
        setGenProgress(0.05 + 0.95 * (acc.length / total));
      }
    } catch (err) {
      console.error("Live generation failed → mock fallback:", err);
      mode = "mock";
      const mock = mockGenerate(trip, prefs);
      acc.length = 0; acc.push(...mock);
      // simulate progressive build for UX
      for (let i = 1; i <= acc.length; i++) {
        setGenDone(i); setGenProgress(0.05 + 0.95 * (i / acc.length));
        await new Promise((r) => setTimeout(r, 160));
      }
    }
    setEngine(mode);
    setDays(acc.slice(0, total));
    setScreen("itinerary");
    if (mode === "mock") showToast("Live API unavailable — used mock engine");
  };

  const regenDay = async (idx) => {
    setRegenIdx(idx);
    const d = days[idx];
    try {
      if (engine === "live") {
        const priorCities = [...new Set(days.slice(0, idx).map((x) => x.city))];
        const [nd] = await claudeGenerateChunk(trip, prefs, d.day_number, d.day_number, priorCities);
        setDays((arr) => arr.map((x, i) => (i === idx ? { ...nd, day_number: d.day_number, date: d.date } : x)));
      } else throw new Error("mock mode");
    } catch {
      // mock regen: re-pick alternates for the same city
      const alt = mockGenerate(trip, { ...prefs, food: Math.min(100, prefs.food + 10) });
      const cand = alt.find((x) => x.city === d.city && x.morning.activity !== d.morning.activity) || alt[idx] || d;
      setDays((arr) => arr.map((x, i) => (i === idx ? { ...cand, day_number: d.day_number, date: d.date, city: d.city } : x)));
    }
    setRegenIdx(null);
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-100" style={{ background: "radial-gradient(ellipse 120% 80% at 50% -10%, #101c3a 0%, #0A0F1E 55%)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        .wp-display { font-family: 'Syne', 'Inter', sans-serif; font-weight: 700; }
        .wp-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 99px;
          background: linear-gradient(90deg, var(--c) var(--p), #1e293b var(--p)); outline: none; }
        .wp-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: var(--c); border: 3px solid #0A0F1E; box-shadow: 0 0 0 1.5px var(--c); cursor: pointer; }
        .wp-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--c);
          border: 3px solid #0A0F1E; box-shadow: 0 0 0 1.5px var(--c); cursor: pointer; }
        .wp-scroll::-webkit-scrollbar { width: 5px; } .wp-scroll::-webkit-scrollbar-thumb { background:#27406b; border-radius:99px; }
        .wp-route { stroke-dashoffset: 200; animation: wpdash 3s linear forwards; }
        @keyframes wpdash { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .wp-route { animation: none; stroke-dashoffset: 0; } .animate-spin, .animate-pulse { animation: none; } }
      `}</style>

      {/* header (hidden on globe screen) */}
      {screen !== "globe" && (
        <div className="flex items-center justify-between px-5 pt-4 max-w-2xl mx-auto w-full">
          <span className="wp-display text-lg text-white">Wander<span style={{ color: "#00E5C3" }}>Plan</span></span>
          {user ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(0,229,195,0.15)", color: "#00E5C3", border: "1px solid rgba(0,229,195,0.4)" }}>
                {user.name[0].toUpperCase()}
              </span>
              {user.name}
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="text-xs text-slate-400 hover:text-teal-300 border border-slate-700 px-3 py-1.5 rounded-full">Sign in</button>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col" style={{ minHeight: screen === "globe" ? "100vh" : "auto" }}>
        {screen === "globe" && (
          <div className="flex-1" style={{ height: "100vh" }}>
            <GlobeScreen selected={selected} onToggle={toggleCountry} onToast={showToast}
              onPlan={() => setScreen("wizard")} />
          </div>
        )}
        {screen === "wizard" && (
          <Wizard trip={trip} setTrip={setTrip} prefs={prefs} setPrefs={setPrefs} user={user}
            onRequestAuth={() => { pendingGen.current = true; setAuthOpen(true); }}
            onGenerate={generate} onBack={() => setScreen("globe")} />
        )}
        {screen === "generating" && (
          <GeneratingScreen progress={genProgress} mode={engine} doneCount={genDone} total={daysBetween(trip.startDate, trip.endDate)} />
        )}
        {screen === "itinerary" && (
          <ItineraryScreen days={days} trip={trip} user={user} engine={engine} locks={locks} setLocks={setLocks}
            onRegenDay={regenDay} regenIdx={regenIdx} events={tripEvents}
            onBackToWizard={() => setScreen("wizard")} onBackToGlobe={() => setScreen("globe")} />
        )}
      </div>

      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)}
          onLogin={(u) => {
            setUser(u); setAuthOpen(false);
            showToast(`Signed in via ${u.provider} (simulated)`);
            if (pendingGen.current) { pendingGen.current = false; generate(); }
          }} />
      )}
      <Toast msg={toast} />
    </div>
  );
}
