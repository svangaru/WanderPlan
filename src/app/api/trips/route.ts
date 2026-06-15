import { NextResponse } from "next/server";
import { requireUserId, HttpError } from "@/lib/api/session";
import { saveTripSchema } from "@/lib/api/schemas";
import { saveDraftTrip, listTrips } from "@/lib/api/trips";

export async function GET() {
  try {
    const userId = await requireUserId();
    const trips = await listTrips(userId);
    return NextResponse.json({ trips });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = saveTripSchema.parse(await req.json());
    const tripId = await saveDraftTrip(userId, body);
    return NextResponse.json({ tripId }, { status: 201 });
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
