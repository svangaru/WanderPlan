-- Add flight details to trips so the itinerary can respect arrival/departure timing.
ALTER TABLE "trips" ADD COLUMN "originAirport" VARCHAR(8);
ALTER TABLE "trips" ADD COLUMN "arrivalAirport" VARCHAR(8);
ALTER TABLE "trips" ADD COLUMN "flightCode" VARCHAR(16);
ALTER TABLE "trips" ADD COLUMN "arrivalTime" VARCHAR(20);
ALTER TABLE "trips" ADD COLUMN "departureTime" VARCHAR(20);
