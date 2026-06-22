/**
 * POST /api/trips/[id]/share
 * Generate a shareable link for an itinerary.
 * Returns the share token and full URL.
 */

import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { generateShareToken, buildShareUrl } from "@/lib/sharing";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const itineraryId = params.id;

    // Verify user owns this itinerary
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: { trip: true },
    });

    if (!itinerary) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: itinerary.tripId },
    });

    if (trip?.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate or return existing token
    let shareToken = itinerary.shareToken;
    if (!shareToken) {
      shareToken = generateShareToken();
      await prisma.itinerary.update({
        where: { id: itineraryId },
        data: {
          shareToken,
          isShared: true,
          sharedAt: new Date(),
        },
      });
    }

    const shareUrl = buildShareUrl(shareToken, request.headers.get("origin") || undefined);

    return NextResponse.json({
      success: true,
      shareToken,
      shareUrl,
    });
  } catch (err) {
    console.error("[share] Error:", err);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}
