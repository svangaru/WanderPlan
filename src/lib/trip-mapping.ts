import type { Prisma, Trip, TripPreference } from "@prisma/client";
import { DEFAULT_PREFS } from "@/lib/constants";
import { toIsoDate } from "@/lib/dates";
import type { Preferences, TripInput } from "@/lib/types";

/**
 * Single source of truth for translating between the wizard's wire shape and
 * the SPEC DB columns. The SPEC `trip_preferences` table stores 15 numeric
 * sliders + a `travel_style` enum; the wizard has 16 sliders. The two
 * accommodation sliders collapse into `travel_style` here (documented lossy
 * mapping): `accomStyle` drives the enum, and `accomType` is not persisted in
 * v1 (it only nudges airbnb-vs-hotel naming in the mock engine).
 */

export function accomStyleToTravelStyle(accomStyle: number): string {
  if (accomStyle <= 33) return "backpacker";
  if (accomStyle >= 67) return "luxury";
  return "mid-range";
}

function travelStyleToAccomStyle(style: string | null): number {
  switch (style) {
    case "backpacker":
      return 20;
    case "luxury":
      return 85;
    default:
      return 50;
  }
}

export function prefsToDb(prefs: Preferences): Prisma.TripPreferenceCreateWithoutTripInput {
  return {
    prefFood: prefs.food,
    prefNature: prefs.nature,
    prefCity: prefs.city,
    prefMusic: prefs.music,
    prefBeach: prefs.beach,
    prefCulture: prefs.culture,
    prefAdventure: prefs.adventure,
    prefNightlife: prefs.nightlife,
    prefWellness: prefs.wellness,
    prefWildlife: prefs.wildlife,
    prefPhotography: prefs.photography,
    prefMinimizeCost: prefs.minCost,
    prefMinimizeFlights: prefs.minFlights,
    prefMaximizeLocal: prefs.local,
    prefPace: prefs.pace,
    travelStyle: accomStyleToTravelStyle(prefs.accomStyle),
  };
}

export function dbToPrefs(p: TripPreference | null): Preferences {
  if (!p) return { ...DEFAULT_PREFS };
  return {
    food: p.prefFood,
    nature: p.prefNature,
    city: p.prefCity,
    music: p.prefMusic,
    beach: p.prefBeach,
    culture: p.prefCulture,
    adventure: p.prefAdventure,
    nightlife: p.prefNightlife,
    wellness: p.prefWellness,
    wildlife: p.prefWildlife,
    photography: p.prefPhotography,
    minCost: p.prefMinimizeCost,
    minFlights: p.prefMinimizeFlights,
    local: p.prefMaximizeLocal,
    pace: p.prefPace,
    accomStyle: travelStyleToAccomStyle(p.travelStyle),
    accomType: 50,
  };
}

export function dbToTripInput(trip: Trip, prefs: TripPreference | null): TripInput {
  return {
    startDate: toIsoDate(trip.startDate),
    endDate: toIsoDate(trip.endDate),
    startCity: trip.startCity,
    endCity: trip.endCity,
    returnTrip: trip.startCity === trip.endCity,
    groupSize: prefs?.groupSize ?? 1,
    groupType: groupTypeFrom(prefs),
    dietary: prefs?.dietaryRestrictions ?? [],
    mobility: prefs?.mobilityNeeds ?? false,
    budget: prefs?.budgetPerDayUsd ? Number(prefs.budgetPerDayUsd) : 150,
    countries: trip.countries,
  };
}

function groupTypeFrom(prefs: TripPreference | null): string {
  if (!prefs) return "Solo";
  if (prefs.hasKids) return "Family with kids";
  if (prefs.groupSize === 1) return "Solo";
  if (prefs.groupSize === 2) return "Couple";
  return "Friends";
}
