import { z } from "zod";

/**
 * Canonical shape of an AI-generated itinerary day (SPEC §AI Prompt Architecture).
 * Both the live Claude engine and the mock engine produce this shape, and it is
 * validated with Zod before persistence. All costs are USD.
 */

const slotSchema = z.object({
  activity: z.string().min(1),
  location: z.string().min(1),
  duration_hours: z.number().nonnegative(),
  cost_usd: z.number().nonnegative(),
  tips: z.string().default(""),
});

// The model often emits an empty/partial object instead of null on days with no
// inter-city travel. Coerce anything without a real `mode` to null so a "no
// transport" day validates cleanly.
const transportSchema = z.preprocess(
  (v) => {
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (typeof o.mode !== "string" || o.mode.trim() === "") return null;
    return o;
  },
  z
    .object({
      mode: z.string(),
      duration: z.string().default(""),
      cost_usd: z.number().nonnegative().default(0),
      booking_note: z.string().default(""),
    })
    .nullable(),
);

const accommodationSchema = z.object({
  type: z.string(),
  name: z.string(),
  area: z.string(),
  est_cost_per_night_usd: z.number().nonnegative(),
});

const eventHighlightSchema = z
  .object({
    name: z.string(),
    url: z.string().default("#"),
    source: z.string().optional(),
  })
  .nullable();

export const itineraryDaySchema = z.object({
  day_number: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  country: z.string(),
  city: z.string(),
  day_theme: z.string(),
  morning: slotSchema,
  afternoon: slotSchema,
  evening: slotSchema,
  transport_from_previous: transportSchema,
  accommodation: accommodationSchema,
  daily_total_cost_usd: z.number().nonnegative(),
  local_tip: z.string().default(""),
  event_highlight: eventHighlightSchema,
});

export const itinerarySchema = z.array(itineraryDaySchema).min(1);

export type ItineraryDay = z.infer<typeof itineraryDaySchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;

/**
 * Parse an array of day objects, attaching the matched live-event id when the
 * model references an event by name. Throws ZodError on invalid shape.
 */
export function parseItinerary(raw: unknown): Itinerary {
  return itinerarySchema.parse(raw);
}
