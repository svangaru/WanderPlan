/** Seed shapes. One file per country under ../countries exports a CountrySeed. */

export interface ExperienceSeed {
  category: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  /** Average cost per person, USD. */
  cost: number;
  /** Typical duration in hours. */
  hours: number;
  /** Popularity 0-10. */
  pop: number;
  desc: string;
  bestSeason?: string[];
  /** Ease of access 0-10 (defaults to 7). */
  accessibility?: number;
}

export interface EventSeed {
  name: string;
  city: string;
  /** ISO YYYY-MM-DD. */
  start: string;
  end: string;
  cost: number;
  source: string;
  desc: string;
  category?: string;
}

export interface CountrySeed {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  continent: string;
  region: string;
  currency: string;
  languages: string[];
  timezoneOffsets: string[];
  avgCostPerDayUsd: number;
  safetyIndex: number; // 0-10
  visaOnArrival: string[];
  bestMonths: number[]; // 1-12
  experiences: ExperienceSeed[];
  events?: EventSeed[];
}
