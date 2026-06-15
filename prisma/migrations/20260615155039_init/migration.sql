-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" CHAR(2) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "continent" VARCHAR(50) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "languages" TEXT[],
    "timezoneOffsets" JSONB NOT NULL,
    "avgCostPerDayUsd" DECIMAL(8,2) NOT NULL,
    "safetyIndex" DECIMAL(4,2) NOT NULL,
    "visaOnArrival" TEXT[],
    "bestMonths" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "countryId" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "locationCity" VARCHAR(100) NOT NULL,
    "locationLat" DECIMAL(9,6) NOT NULL,
    "locationLng" DECIMAL(9,6) NOT NULL,
    "avgCostUsd" DECIMAL(8,2) NOT NULL,
    "durationHours" DECIMAL(4,1) NOT NULL,
    "bestSeason" TEXT[],
    "accessibility" DECIMAL(4,2) NOT NULL,
    "popularityScore" DECIMAL(4,2) NOT NULL,
    "sourceUrl" TEXT,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "countryId" UUID NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "description" TEXT,
    "ticketUrl" TEXT,
    "estimatedCostUsd" DECIMAL(8,2),
    "source" VARCHAR(100) NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "live_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "displayName" VARCHAR(100),
    "avatarUrl" TEXT,
    "homeCountry" CHAR(2),
    "passportCountry" CHAR(2),
    "preferredCurrency" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),
    "emailVerified" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiresAt" INTEGER,
    "tokenType" TEXT,
    "scope" TEXT,
    "idToken" TEXT,
    "sessionState" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" UUID NOT NULL,
    "tripName" VARCHAR(200) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "startCity" VARCHAR(100) NOT NULL,
    "startCountry" CHAR(2) NOT NULL,
    "endCity" VARCHAR(100) NOT NULL,
    "endCountry" CHAR(2) NOT NULL,
    "countries" CHAR(2)[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isCollaborative" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "prefFood" INTEGER NOT NULL DEFAULT 50,
    "prefNature" INTEGER NOT NULL DEFAULT 50,
    "prefCity" INTEGER NOT NULL DEFAULT 50,
    "prefMusic" INTEGER NOT NULL DEFAULT 50,
    "prefBeach" INTEGER NOT NULL DEFAULT 50,
    "prefCulture" INTEGER NOT NULL DEFAULT 50,
    "prefAdventure" INTEGER NOT NULL DEFAULT 50,
    "prefNightlife" INTEGER NOT NULL DEFAULT 50,
    "prefWellness" INTEGER NOT NULL DEFAULT 50,
    "prefWildlife" INTEGER NOT NULL DEFAULT 50,
    "prefPhotography" INTEGER NOT NULL DEFAULT 50,
    "prefMinimizeCost" INTEGER NOT NULL DEFAULT 50,
    "prefMinimizeFlights" INTEGER NOT NULL DEFAULT 50,
    "prefMaximizeLocal" INTEGER NOT NULL DEFAULT 50,
    "prefPace" INTEGER NOT NULL DEFAULT 50,
    "budgetPerDayUsd" DECIMAL(8,2),
    "travelStyle" TEXT,
    "groupSize" INTEGER NOT NULL DEFAULT 1,
    "hasKids" BOOLEAN NOT NULL DEFAULT false,
    "mobilityNeeds" BOOLEAN NOT NULL DEFAULT false,
    "dietaryRestrictions" TEXT[],

    CONSTRAINT "trip_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_collaborators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itineraries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelVersion" VARCHAR(50) NOT NULL,
    "rawPrompt" TEXT NOT NULL,
    "rawResponse" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itineraryId" UUID NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "dayTheme" VARCHAR(200) NOT NULL,
    "morningActivity" TEXT NOT NULL,
    "afternoonActivity" TEXT NOT NULL,
    "eveningActivity" TEXT NOT NULL,
    "accommodationType" VARCHAR(100),
    "accommodationNotes" TEXT,
    "transportFromPrev" TEXT,
    "estimatedCostUsd" DECIMAL(8,2),
    "weatherNote" TEXT,
    "tips" TEXT[],
    "isLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "itinerary_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_day_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itineraryDayId" UUID NOT NULL,
    "experienceId" UUID NOT NULL,

    CONSTRAINT "itinerary_day_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_day_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itineraryDayId" UUID NOT NULL,
    "eventId" UUID NOT NULL,

    CONSTRAINT "itinerary_day_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "countryId" UUID NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "pricePerNightUsd" DECIMAL(8,2) NOT NULL,
    "rating" DECIMAL(3,2),
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "bookingUrl" TEXT,
    "airbnbListingId" VARCHAR(50),
    "hotelId" VARCHAR(50),
    "amenities" TEXT[],

    CONSTRAINT "accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE INDEX "country_experiences_countryId_idx" ON "country_experiences"("countryId");

-- CreateIndex
CREATE INDEX "country_experiences_locationCity_idx" ON "country_experiences"("locationCity");

-- CreateIndex
CREATE INDEX "live_events_countryId_idx" ON "live_events"("countryId");

-- CreateIndex
CREATE INDEX "live_events_startDate_endDate_idx" ON "live_events"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "live_events_city_idx" ON "live_events"("city");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "trips_createdBy_idx" ON "trips"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "trip_preferences_tripId_key" ON "trip_preferences"("tripId");

-- CreateIndex
CREATE INDEX "trip_collaborators_tripId_idx" ON "trip_collaborators"("tripId");

-- CreateIndex
CREATE INDEX "trip_collaborators_userId_idx" ON "trip_collaborators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_collaborators_tripId_userId_key" ON "trip_collaborators"("tripId", "userId");

-- CreateIndex
CREATE INDEX "itineraries_tripId_idx" ON "itineraries"("tripId");

-- CreateIndex
CREATE INDEX "itinerary_days_itineraryId_idx" ON "itinerary_days"("itineraryId");

-- CreateIndex
CREATE INDEX "itinerary_days_date_idx" ON "itinerary_days"("date");

-- CreateIndex
CREATE INDEX "itinerary_day_experiences_itineraryDayId_idx" ON "itinerary_day_experiences"("itineraryDayId");

-- CreateIndex
CREATE INDEX "itinerary_day_experiences_experienceId_idx" ON "itinerary_day_experiences"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_day_experiences_itineraryDayId_experienceId_key" ON "itinerary_day_experiences"("itineraryDayId", "experienceId");

-- CreateIndex
CREATE INDEX "itinerary_day_events_itineraryDayId_idx" ON "itinerary_day_events"("itineraryDayId");

-- CreateIndex
CREATE INDEX "itinerary_day_events_eventId_idx" ON "itinerary_day_events"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_day_events_itineraryDayId_eventId_key" ON "itinerary_day_events"("itineraryDayId", "eventId");

-- CreateIndex
CREATE INDEX "accommodations_countryId_idx" ON "accommodations"("countryId");

-- CreateIndex
CREATE INDEX "accommodations_city_idx" ON "accommodations"("city");

-- AddForeignKey
ALTER TABLE "country_experiences" ADD CONSTRAINT "country_experiences_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_preferences" ADD CONSTRAINT "trip_preferences_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "itineraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_day_experiences" ADD CONSTRAINT "itinerary_day_experiences_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_day_experiences" ADD CONSTRAINT "itinerary_day_experiences_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "country_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_day_events" ADD CONSTRAINT "itinerary_day_events_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_day_events" ADD CONSTRAINT "itinerary_day_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "live_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
