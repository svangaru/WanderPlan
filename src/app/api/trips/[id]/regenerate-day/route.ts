import { NextResponse } from "next/server";
import { requireUserId, HttpError } from "@/lib/api/session";
import { z } from "zod";
import { regenerateDaySchema } from "@/lib/api/schemas";
import { loadOwnedTrip } from "@/lib/api/trips";
import { dbToTripInput, dbToPrefs } from "@/lib/trip-mapping";
import { assembleGroundingContext } from "@/lib/itinerary/grounding";
import { loadActiveItinerary, replaceItineraryDay } from "@/lib/itinerary/persist";
import { regenerateDay } from "@/lib/itinerary/regenerate";
import {
  assertWithinQuota,
  logGeneration,
  QuotaExceededError,
} from "@/lib/itinerary/guardrails";

export const dynamic = "force-dynamic";

/** Regenerates one day of the active itinerary, keeping locked days fixed. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const json = await req.json();
    const { dayNumber, lockedDayNumbers } = regenerateDaySchema.parse(json);
    const engine = z.enum(["mock", "live"]).default("live").parse(json.engine);

    const trip = await loadOwnedTrip(userId, params.id);
    if (!trip) throw new HttpError(404, "Trip not found");

    const active = await loadActiveItinerary(params.id);
    if (!active) throw new HttpError(404, "No itinerary to regenerate");

    await assertWithinQuota(userId, "day");

    const tripInput = dbToTripInput(trip, trip.preferences);
    const prefs = dbToPrefs(trip.preferences);
    const { experiences, events } = await assembleGroundingContext(
      tripInput.countries,
      tripInput.startDate,
      tripInput.endDate,
    );

    const result = await regenerateDay({
      ctx: { trip: tripInput, prefs },
      experiences,
      events,
      currentDays: active.days,
      dayNumber,
      lockedDayNumbers,
      requested: engine,
    });

    await replaceItineraryDay({
      itineraryId: active.itineraryId,
      day: result.day,
      experiences,
      events,
    });

    await logGeneration({
      userId,
      tripId: params.id,
      kind: "day",
      engine: result.engine,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });

    return NextResponse.json({ day: result.day, engine: result.engine });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: err.message, resetAt: err.resetAt }, { status: 429 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
