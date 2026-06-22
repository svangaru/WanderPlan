/**
 * GET /api/trips/[id]/export-json
 * Export itinerary as JSON.
 * Includes all day details, activities, costs.
 */

import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const itineraryId = params.id;

    // Fetch itinerary with all details
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: {
        trip: true,
        days: {
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    if (!itinerary) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
    }

    // Verify ownership
    const trip = await prisma.trip.findUnique({
      where: { id: itinerary.tripId },
    });

    if (trip?.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Transform to export format
    const exported = {
      trip: {
        country: trip.countries[0] || "Unknown",
        startDate: trip.startDate,
        endDate: trip.endDate,
        groupSize: trip.groupSize,
        budget: trip.budget,
      },
      generatedAt: itinerary.generatedAt.toISOString(),
      days: itinerary.days.map((day: any) => ({
        dayNumber: day.dayNumber,
        date: day.date.toISOString().split("T")[0],
        city: day.city,
        theme: day.dayTheme,
        activities: {
          morning: day.morningActivity,
          afternoon: day.afternoonActivity,
          evening: day.eveningActivity,
        },
        tips: day.tips || [],
        estimatedCost: day.estimatedCostUsd ? Number(day.estimatedCostUsd) : 0,
        accommodationType: day.accommodationType,
      })),
    };

    // Return as JSON file download
    const filename = `${trip.countries[0] || "trip"}-${trip.startDate}.json`;
    return NextResponse.json(exported, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[export-json] Error:", err);
    return NextResponse.json({ error: "Failed to export JSON" }, { status: 500 });
  }
}
