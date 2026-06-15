import { z } from "zod";

const prefValue = z.number().int().min(0).max(100);

export const preferencesSchema = z.object({
  food: prefValue,
  nature: prefValue,
  city: prefValue,
  music: prefValue,
  beach: prefValue,
  culture: prefValue,
  nightlife: prefValue,
  wellness: prefValue,
  photography: prefValue,
  adventure: prefValue,
  wildlife: prefValue,
  pace: prefValue,
  local: prefValue,
  minCost: prefValue,
  minFlights: prefValue,
  accomStyle: prefValue,
  accomType: prefValue,
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const tripInputSchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
  startCity: z.string().min(1).max(100),
  endCity: z.string().max(100).default(""),
  returnTrip: z.boolean().default(true),
  groupSize: z.number().int().min(1).max(20),
  groupType: z.string().max(50),
  dietary: z.array(z.string().max(50)).default([]),
  mobility: z.boolean().default(false),
  budget: z.number().min(20).max(5000),
  countries: z.array(z.string().length(2)).min(1).max(5),
});

/** Draft trip save: trip fields + preferences, used by the wizard as it advances. */
export const saveTripSchema = z.object({
  trip: tripInputSchema,
  prefs: preferencesSchema,
});

export const generateSchema = z.object({
  tripId: z.string().uuid(),
  engine: z.enum(["mock", "live"]).default("live"),
});

export const regenerateDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  lockedDayNumbers: z.array(z.number().int().positive()).default([]),
});

export type SaveTripBody = z.infer<typeof saveTripSchema>;
