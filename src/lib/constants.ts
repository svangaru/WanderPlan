/**
 * Shared design + domain constants.
 * Visual identity per SPEC §UI/UX: navy base, electric teal, amber, Syne/Inter.
 */

export const COLORS = {
  navy: "#0A0F1E",
  teal: "#00E5C3",
  amber: "#F5A623",
  experiences: "#34D399",
  paceStyle: "#60A5FA",
  practical: "#F5A623",
  accommodation: "#C084FC",
} as const;

/** Countries shown on the globe. The 10 curated launch countries are active. */
export const GLOBE_COUNTRIES = [
  { code: "IT", name: "Italy", lat: 42.8, lng: 12.5, active: true },
  { code: "FR", name: "France", lat: 46.6, lng: 2.4, active: true },
  { code: "ES", name: "Spain", lat: 40.3, lng: -3.7, active: true },
  { code: "PT", name: "Portugal", lat: 39.5, lng: -8.0, active: true },
  { code: "GR", name: "Greece", lat: 39.0, lng: 22.0, active: true },
  { code: "TR", name: "Türkiye", lat: 39.0, lng: 35.2, active: true },
  { code: "JP", name: "Japan", lat: 36.2, lng: 138.3, active: true },
  { code: "TH", name: "Thailand", lat: 15.9, lng: 101.0, active: true },
  { code: "US", name: "United States", lat: 39.8, lng: -98.6, active: true },
  { code: "MX", name: "Mexico", lat: 23.6, lng: -102.5, active: true },
  { code: "HR", name: "Croatia", lat: 45.1, lng: 15.2, active: false },
  { code: "MA", name: "Morocco", lat: 31.8, lng: -7.1, active: false },
  { code: "IS", name: "Iceland", lat: 64.9, lng: -18.6, active: false },
  { code: "PE", name: "Peru", lat: -9.2, lng: -75.0, active: false },
] as const;

export const MAX_COUNTRIES_PER_TRIP = 5;

/** Maps an experience category to the preference slider that scores it. */
export const CATEGORY_TO_PREF: Record<string, PrefKey> = {
  food: "food",
  food_festival: "food",
  nature: "nature",
  hike: "nature",
  waterfall: "nature",
  scenic: "nature",
  city: "city",
  event: "city",
  music: "music",
  concert: "music",
  beach: "beach",
  swimming: "beach",
  cultural: "culture",
  spiritual: "culture",
  adventure: "adventure",
  wellness: "wellness",
  nightlife: "nightlife",
  photography: "photography",
  wildlife: "wildlife",
};

export type PrefKey =
  | "food"
  | "nature"
  | "city"
  | "music"
  | "beach"
  | "culture"
  | "nightlife"
  | "wellness"
  | "photography"
  | "adventure"
  | "wildlife"
  | "pace"
  | "local"
  | "minCost"
  | "minFlights"
  | "accomStyle"
  | "accomType";

export interface SliderDef {
  key: PrefKey;
  icon: string;
  label: string;
  ends?: [string, string];
}

export interface SliderGroup {
  label: string;
  color: string;
  sliders: SliderDef[];
}

/** 16 sliders grouped into 4 color-coded categories (SPEC §Trip Setup Step 3). */
export const SLIDER_GROUPS: SliderGroup[] = [
  {
    label: "Experiences",
    color: COLORS.experiences,
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
    label: "Pace & Style",
    color: COLORS.paceStyle,
    sliders: [
      { key: "pace", icon: "⚡", label: "Trip Pace", ends: ["Relaxed", "Packed"] },
      { key: "local", icon: "🗺️", label: "Discovery Style", ends: ["Hotspots", "Hidden gems"] },
    ],
  },
  {
    label: "Practical",
    color: COLORS.practical,
    sliders: [
      { key: "minCost", icon: "💸", label: "Budget Sensitivity", ends: ["Splurge", "Save"] },
      { key: "minFlights", icon: "🚆", label: "Flight Aversion", ends: ["Fly freely", "Trains only"] },
    ],
  },
  {
    label: "Accommodation",
    color: COLORS.accommodation,
    sliders: [
      { key: "accomStyle", icon: "🏨", label: "Accommodation Style", ends: ["Backpacker", "Luxury"] },
      { key: "accomType", icon: "🏠", label: "Stay Type", ends: ["Hotels", "Local stays"] },
    ],
  },
];

export const DEFAULT_PREFS: Record<PrefKey, number> = {
  food: 70,
  nature: 60,
  city: 65,
  music: 40,
  beach: 50,
  culture: 55,
  nightlife: 35,
  wellness: 25,
  photography: 45,
  adventure: 30,
  pace: 55,
  local: 50,
  minCost: 50,
  minFlights: 70,
  accomStyle: 50,
  accomType: 50,
  wildlife: 20,
};

export const GROUP_TYPES = ["Solo", "Couple", "Friends", "Family with kids"] as const;
export const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Halal",
  "Kosher",
] as const;

/**
 * Per-country presentation + mock-engine flavor, keyed by ISO alpha-2 code.
 * Keeps the deterministic mock engine and the UI from being Italy-specific:
 * transport defaults, accommodation area phrasing, local tips, name, and flag.
 */
export interface CountryFlavor {
  name: string;
  flag: string;
  transportMode: string;
  transportNote: string;
  accomArea: string;
  localTips: string[];
}

const DEFAULT_FLAVOR: CountryFlavor = {
  name: "your destination",
  flag: "🌍",
  transportMode: "train",
  transportNote: "Book intercity transport a week or two ahead for the best fares.",
  accomArea: "city centre",
  localTips: [
    "Carry some local cash for small vendors.",
    "Learn 'hello' and 'thank you' in the local language.",
    "Meal times vary by country — ask locally.",
    "Check whether the tap water is potable before drinking.",
    "Multi-day transit passes usually beat single tickets.",
  ],
};

export const COUNTRY_FLAVOR: Record<string, CountryFlavor> = {
  IT: {
    name: "Italy",
    flag: "🇮🇹",
    transportMode: "train",
    transportNote: "Trenitalia / Italo — book Frecciarossa 1–2 weeks ahead for best fares.",
    accomArea: "centro storico",
    localTips: [
      "Cappuccino is a before-11am drink — order espresso after meals.",
      "Validate regional train tickets in the green machines before boarding.",
      "Museums are free the first Sunday of each month.",
      "Riposo: many shops close 1–4pm — plan lunches long.",
      "Tap water from nasoni fountains is excellent and free.",
      "Dinner before 7:30pm marks you as a tourist — book 8:30+.",
    ],
  },
  FR: {
    name: "France",
    flag: "🇫🇷",
    transportMode: "train",
    transportNote: "SNCF TGV — book on SNCF Connect early for cheap advance fares.",
    accomArea: "city centre",
    localTips: [
      "Say 'Bonjour' before anything else in a shop — it matters.",
      "Many national museums are free the first Sunday of the month.",
      "Lunch is 12–2pm sharp; kitchens close after.",
      "Ask for 'une carafe d'eau' — tap water is free.",
      "Validate (composter) regional train tickets before boarding.",
    ],
  },
  ES: {
    name: "Spain",
    flag: "🇪🇸",
    transportMode: "train",
    transportNote: "Renfe AVE high-speed — book early for promo fares.",
    accomArea: "casco antiguo",
    localTips: [
      "Lunch is 2–4pm, dinner rarely before 9pm.",
      "Many shops close for siesta 2–5pm.",
      "In Granada and León, tapas often come free with a drink.",
      "The menú del día is the best-value weekday lunch.",
      "Some museums are free in the late afternoon.",
    ],
  },
  US: {
    name: "the United States",
    flag: "🇺🇸",
    transportMode: "domestic flight",
    transportNote: "Distances are huge — book a domestic flight or rent a car; Amtrak only on some corridors.",
    accomArea: "downtown",
    localTips: [
      "Tipping 18–20% is expected at sit-down restaurants.",
      "Sales tax is added at the register, not on the sticker price.",
      "Tap water is free and safe almost everywhere.",
      "Visiting 3+ national parks? The $80 annual pass pays off.",
      "Ride-share is usually easier than transit outside big cities.",
    ],
  },
  TR: {
    name: "Türkiye",
    flag: "🇹🇷",
    transportMode: "bus",
    transportNote: "Intercity buses are comfy and cheap; domestic flights link far cities.",
    accomArea: "old town",
    localTips: [
      "Carry small lira for bazaars — and haggle, politely.",
      "Cover shoulders and knees and remove shoes in mosques.",
      "Accepting offered çay (tea) is a friendly gesture.",
      "Get an İstanbulkart for trams, ferries, and buses.",
      "Drink bottled water, not tap.",
    ],
  },
  MX: {
    name: "Mexico",
    flag: "🇲🇽",
    transportMode: "bus",
    transportNote: "ADO first-class buses are excellent between cities; fly for long hops.",
    accomArea: "centro histórico",
    localTips: [
      "Drink bottled water only, never the tap.",
      "Carry pesos — street stands don't take cards.",
      "Tip 10–15% at restaurants.",
      "Eat where there's a queue of locals.",
      "The afternoon comida is the big meal of the day.",
    ],
  },
  JP: {
    name: "Japan",
    flag: "🇯🇵",
    transportMode: "train",
    transportNote: "Japan Rail Pass + Shinkansen; reserve seats at peak times.",
    accomArea: "near the station",
    localTips: [
      "Carry cash — many places still don't take cards.",
      "Don't tip; it can cause confusion.",
      "Stand left on Tokyo escalators (right in Osaka).",
      "Get an IC card (Suica/ICOCA) for trains and konbini.",
      "Keep quiet on trains; take calls in the vestibule.",
    ],
  },
  GR: {
    name: "Greece",
    flag: "🇬🇷",
    transportMode: "ferry",
    transportNote: "Blue Star / Hellenic ferries between islands — book ahead in summer.",
    accomArea: "old town (chora)",
    localTips: [
      "Dinner starts late, from 9pm.",
      "Carry cash for tavernas and island kiosks.",
      "Afternoon shops close roughly 2–5:30pm.",
      "Tap water is fine in Athens; bottled on some islands.",
      "Rounding up the bill is enough of a tip.",
    ],
  },
  TH: {
    name: "Thailand",
    flag: "🇹🇭",
    transportMode: "overnight train",
    transportNote: "Overnight trains and cheap domestic flights; book sleepers early.",
    accomArea: "old town",
    localTips: [
      "Cover shoulders and knees at temples.",
      "Never touch anyone's head or point your feet at people.",
      "Agree the tuk-tuk fare before getting in.",
      "Carry small baht for street food.",
      "Don't drink the tap water.",
    ],
  },
  PT: {
    name: "Portugal",
    flag: "🇵🇹",
    transportMode: "train",
    transportNote: "Comboios de Portugal — the Lisbon–Porto Alfa Pendular is fast; book online.",
    accomArea: "centro histórico",
    localTips: [
      "'Um café' means an espresso (also called uma bica).",
      "Lunch 12–3pm; dinner from 7:30pm.",
      "The couvert (bread/olives) on the table is charged.",
      "Get a Viva Viagem card for Lisbon transit.",
      "Pastéis de nata are best warm with cinnamon.",
    ],
  },
};

export function countryFlavor(code: string): CountryFlavor {
  return COUNTRY_FLAVOR[code?.toUpperCase()] ?? DEFAULT_FLAVOR;
}

/** Reverse lookup: country display name → ISO alpha-2 code (for persistence). */
export function codeForCountryName(name: string): string {
  const match = Object.entries(COUNTRY_FLAVOR).find(
    ([, f]) => f.name.toLowerCase() === name.toLowerCase(),
  );
  if (match) return match[0];
  return name.slice(0, 2).toUpperCase();
}

/**
 * Major cities per country, gateway/first listed as the default. These are the
 * cities we actually have curated experiences in, so the dropdown choices map
 * straight to what the itinerary can use. Users can still type a custom city.
 */
export const COUNTRY_CITIES: Record<string, string[]> = {
  IT: ["Rome", "Florence", "Venice", "Milan", "Naples", "Bologna", "Siena", "Verona", "Amalfi", "Palermo", "Como"],
  FR: ["Paris", "Nice", "Lyon", "Marseille", "Bordeaux", "Avignon", "Reims", "Chamonix", "Carcassonne", "Versailles"],
  ES: ["Madrid", "Barcelona", "Seville", "Granada", "Málaga", "San Sebastián", "Córdoba", "Ronda", "Logroño"],
  US: ["New York", "San Francisco", "Las Vegas", "New Orleans", "Honolulu", "Washington", "Yellowstone", "Grand Canyon", "Yosemite"],
  TR: ["Istanbul", "Göreme", "Antalya", "Fethiye", "Pamukkale", "Selçuk", "Gaziantep"],
  MX: ["Mexico City", "Oaxaca", "Tulum", "Playa del Carmen", "Guanajuato", "San Miguel de Allende", "Puebla", "Valladolid", "Cozumel"],
  JP: ["Tokyo", "Kyoto", "Osaka", "Hiroshima", "Nara", "Hakone", "Sapporo", "Niseko", "Fujiyoshida"],
  GR: ["Athens", "Santorini", "Mykonos", "Heraklion", "Chania", "Nafplio", "Delphi", "Zakynthos", "Kalambaka"],
  TH: ["Bangkok", "Chiang Mai", "Phuket", "Krabi", "Ayutthaya", "Kanchanaburi", "Ko Pha-ngan"],
  PT: ["Lisbon", "Porto", "Sintra", "Lagos", "Cascais", "Évora", "Nazaré"],
};

export function majorCities(code: string): string[] {
  return COUNTRY_CITIES[code?.toUpperCase()] ?? [];
}

export function defaultCity(code: string): string {
  return majorCities(code)[0] ?? "";
}
