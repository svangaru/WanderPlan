/**
 * GET /api/trips/[id]/export-pdf
 * Export itinerary as PDF.
 * Returns a PDF file ready for download.
 */

import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

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

    // Fetch itinerary with days
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

    // Generate PDF
    const doc = new PDFDocument();
    const filename = `${trip.countries[0] || "trip"}-${trip.startDate}.pdf`;

    // Set response headers
    const response = new NextResponse(doc as any);
    response.headers.set("Content-Type", "application/pdf");
    response.headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    // Title
    doc.fontSize(24).font("Helvetica-Bold").text("Your Itinerary", { align: "center" });
    doc.moveDown(0.5);

    // Trip details
    doc.fontSize(12).font("Helvetica");
    doc.text(`${trip.countries[0] || "Your Trip"} · ${trip.startDate} to ${trip.endDate}`, { align: "center" });
    doc.text(`${itinerary.days.length} days · ${trip.groupSize} traveler${trip.groupSize > 1 ? "s" : ""}`, {
      align: "center",
    });
    doc.moveDown(1);

    // Days
    itinerary.days.forEach((day: any, idx: number) => {
      if (idx > 0) {
        doc.addPage();
      }

      // Day header
      doc.fontSize(16).font("Helvetica-Bold").text(`Day ${day.dayNumber}: ${day.city}`);
      doc.fontSize(10).font("Helvetica").fillColor("#666666").text(day.date.toLocaleDateString());
      doc.fillColor("#000000");
      doc.moveDown(0.5);

      // Activities
      const activities = [
        { time: "Morning", activity: day.morningActivity },
        { time: "Afternoon", activity: day.afternoonActivity },
        { time: "Evening", activity: day.eveningActivity },
      ];

      activities.forEach(({ time, activity }: { time: string; activity: string }) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${time}:`);
        doc.fontSize(10).font("Helvetica").text(activity, { indent: 20 });
        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);

      // Tips
      if (day.tips && day.tips.length > 0) {
        doc.fontSize(11).font("Helvetica-Bold").text("Tips:");
        day.tips.forEach((tip: string) => {
          doc.fontSize(10).font("Helvetica").text(`• ${tip}`, { indent: 20 });
        });
        doc.moveDown(0.5);
      }

      // Cost
      if (day.estimatedCostUsd) {
        doc.fontSize(10).font("Helvetica").text(`Est. cost: $${Number(day.estimatedCostUsd).toFixed(2)}`);
      }
    });

    doc.end();

    return response;
  } catch (err) {
    console.error("[export-pdf] Error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
