import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/api/session";
import { loadOwnedTrip } from "@/lib/api/trips";
import { loadActiveItinerary } from "@/lib/itinerary/persist";
import { assembleGroundingContext } from "@/lib/itinerary/grounding";
import { dbToTripInput } from "@/lib/trip-mapping";
import { ItineraryView } from "@/components/itinerary/ItineraryView";

export const dynamic = "force-dynamic";

export default async function TripPage({ params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/auth/signin?callbackUrl=/trip/" + params.id);

  const trip = await loadOwnedTrip(userId, params.id);
  if (!trip) redirect("/");

  const active = await loadActiveItinerary(params.id);
  if (!active) redirect("/plan");

  const tripInput = dbToTripInput(trip, trip.preferences);
  const { experiences, events } = await assembleGroundingContext(
    tripInput.countries,
    tripInput.startDate,
    tripInput.endDate,
  );

  const cityCoords: Record<string, { lat: number; lng: number }> = {};
  for (const e of experiences) {
    if (!(e.city in cityCoords)) cityCoords[e.city] = { lat: e.lat, lng: e.lng };
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-4">
        <span className="wp-display text-lg text-white">
          Wander<span style={{ color: "#00E5C3" }}>Plan</span>
        </span>
      </header>
      <ItineraryView
        tripId={params.id}
        initialDays={active.days}
        engineModel={active.engineModel}
        events={events}
        cityCoords={cityCoords}
        headline={{
          start: tripInput.startDate,
          end: tripInput.endDate,
          groupSize: tripInput.groupSize,
        }}
      />
    </main>
  );
}
