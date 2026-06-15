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

/** Countries shown on the globe. Only Italy is active in v1. */
export const GLOBE_COUNTRIES = [
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
