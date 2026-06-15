import { prisma } from "@/lib/prisma";
import { prefsToDb, accomStyleToTravelStyle } from "@/lib/trip-mapping";
import type { SaveTripBody } from "@/lib/api/schemas";

/**
 * Upserts a draft trip and its preferences for a user. The wizard calls this as
 * the user advances, passing the same tripId once one exists. Returns the trip id.
 */
export async function saveDraftTrip(
  userId: string,
  body: SaveTripBody,
  tripId?: string,
): Promise<string> {
  const { trip, prefs } = body;
  const endCity = trip.returnTrip ? trip.startCity : trip.endCity || trip.startCity;
  const primaryCountry = trip.countries[0] ?? "IT";

  const tripData = {
    tripName: `${trip.countries.join(", ")} · ${trip.startDate}`,
    startDate: new Date(trip.startDate),
    endDate: new Date(trip.endDate),
    startCity: trip.startCity,
    startCountry: primaryCountry,
    endCity,
    endCountry: primaryCountry,
    countries: trip.countries,
    status: "draft",
  };

  const prefData = {
    ...prefsToDb(prefs),
    budgetPerDayUsd: trip.budget,
    travelStyle: accomStyleToTravelStyle(prefs.accomStyle),
    groupSize: trip.groupSize,
    hasKids: trip.groupType === "Family with kids",
    mobilityNeeds: trip.mobility,
    dietaryRestrictions: trip.dietary,
  };

  if (tripId) {
    const existing = await prisma.trip.findFirst({ where: { id: tripId, createdBy: userId } });
    if (existing) {
      await prisma.trip.update({ where: { id: tripId }, data: tripData });
      await prisma.tripPreference.upsert({
        where: { tripId },
        create: { tripId, ...prefData },
        update: prefData,
      });
      return tripId;
    }
  }

  const created = await prisma.trip.create({
    data: {
      ...tripData,
      createdBy: userId,
      preferences: { create: prefData },
    },
  });
  return created.id;
}

/** Loads a trip the user owns, with preferences. Returns null if not found/owned. */
export async function loadOwnedTrip(userId: string, tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, createdBy: userId },
    include: { preferences: true },
  });
}

/** Lists a user's trips (newest first) for the dashboard. */
export async function listTrips(userId: string) {
  return prisma.trip.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: "desc" },
    include: { preferences: true },
  });
}
