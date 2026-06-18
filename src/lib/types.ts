import type { PrefKey } from "@/lib/constants";

/** Slider preferences (0-100), keyed by the wizard's slider keys. */
export type Preferences = Record<PrefKey, number>;

/** Part-of-day options for arrival/departure timing. */
export type PartOfDay = "Morning" | "Afternoon" | "Evening" | "Late night";

/** Trip form state as collected by the wizard (wire shape). */
export interface TripInput {
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  startCity: string;
  endCity: string;
  returnTrip: boolean;
  groupSize: number;
  groupType: string;
  dietary: string[];
  mobility: boolean;
  budget: number; // USD per person per day
  countries: string[]; // ISO alpha-2 codes (exactly one in v1)
  originAirport: string; // IATA code the traveler departs from
  arrivalAirport: string; // IATA code they fly into
  flightCode: string; // optional, e.g. "AZ609"
  arrivalTime: PartOfDay; // when they land on the first day
  departureTime: PartOfDay; // when they fly out on the last day
}

/** Context passed to the generation engines. */
export interface GenerationContext {
  trip: TripInput;
  prefs: Preferences;
}

/** A grounding row pulled from country_experiences for the prompt. */
export interface ExperienceContext {
  id: string;
  name: string;
  city: string;
  category: string;
  cost_usd: number;
  hours: number;
  popularity: number;
  lat: number;
  lng: number;
  description: string;
}

/** A grounding row pulled from live_events for the prompt. */
export interface EventContext {
  id: string;
  name: string;
  city: string;
  category: string;
  start: string;
  end: string;
  cost_usd: number;
  url: string;
  source: string;
  description: string;
}

export type GenerationEngine = "mock" | "live";
