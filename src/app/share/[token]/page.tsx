/**
 * /share/[token]
 * Public view of a shared itinerary.
 * No auth required — anyone with the link can view.
 */

import { PrismaClient } from "@prisma/client";
import { isValidShareToken } from "@/lib/sharing";
import { notFound } from "next/navigation";
import { ItineraryView } from "@/components/itinerary/ItineraryView";
import type { ItineraryDay } from "@/lib/itinerary/schema";

const prisma = new PrismaClient();

interface PageProps {
  params: { token: string };
}

export default async function SharePage({ params }: PageProps) {
  // Validate token format
  if (!isValidShareToken(params.token)) {
    notFound();
  }

  // Fetch shared itinerary
  const itinerary = await prisma.itinerary.findUnique({
    where: { shareToken: params.token },
    include: {
      trip: true,
      days: {
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  if (!itinerary || !itinerary.isShared) {
    notFound();
  }

  // Transform DB format to component format
  const days: ItineraryDay[] = itinerary.days.map((day: any) => ({
    day_number: day.dayNumber,
    date: day.date.toISOString().split("T")[0],
    country: "", // not stored in DB, will be inferred
    city: day.city,
    day_theme: day.dayTheme,
    morning: {
      activity: day.morningActivity,
      location: day.city,
      duration_hours: 3,
      cost_usd: day.estimatedCostUsd ? Number(day.estimatedCostUsd) / 3 : 0,
      tips: day.tips?.[0] || "",
    },
    afternoon: {
      activity: day.afternoonActivity,
      location: day.city,
      duration_hours: 3,
      cost_usd: day.estimatedCostUsd ? Number(day.estimatedCostUsd) / 3 : 0,
      tips: day.tips?.[1] || "",
    },
    evening: {
      activity: day.eveningActivity,
      location: day.city,
      duration_hours: 3,
      cost_usd: day.estimatedCostUsd ? Number(day.estimatedCostUsd) / 3 : 0,
      tips: day.tips?.[2] || "",
    },
    transport_from_previous: day.transportFromPrev ? JSON.parse(day.transportFromPrev) : null,
    accommodation: {
      type: day.accommodationType || "hotel",
      name: "Local accommodation",
      area: day.city,
      est_cost_per_night_usd: 100,
    },
    daily_total_cost_usd: day.estimatedCostUsd ? Number(day.estimatedCostUsd) : 0,
    local_tip: day.weatherNote || "",
    event_highlight: null,
  }));

  const trip = itinerary.trip;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="mb-8 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-200">
            📤 This itinerary was shared with you. You can view it but cannot edit.
          </p>
        </div>

        <ItineraryView
          tripId={trip.id}
          initialDays={days}
          engineModel="shared"
          events={[]}
          cityCoords={{}}
          headline={{
            start: trip.startDate,
            end: trip.endDate,
            groupSize: trip.groupSize,
            countryName: trip.countries[0] || "Unknown",
            countryCode: trip.countries[0] || "IT",
          }}
        />
      </div>
    </div>
  );
}
