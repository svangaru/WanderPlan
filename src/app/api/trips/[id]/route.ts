import { NextResponse } from "next/server";
import { requireUserId, HttpError } from "@/lib/api/session";
import { saveTripSchema } from "@/lib/api/schemas";
import { saveDraftTrip, loadOwnedTrip } from "@/lib/api/trips";
import { dbToTripInput, dbToPrefs } from "@/lib/trip-mapping";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const trip = await loadOwnedTrip(userId, params.id);
    if (!trip) throw new HttpError(404, "Trip not found");
    return NextResponse.json({
      tripId: trip.id,
      trip: dbToTripInput(trip, trip.preferences),
      prefs: dbToPrefs(trip.preferences),
      status: trip.status,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = saveTripSchema.parse(await req.json());
    const tripId = await saveDraftTrip(userId, body, params.id);
    return NextResponse.json({ tripId });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 400 });
}
