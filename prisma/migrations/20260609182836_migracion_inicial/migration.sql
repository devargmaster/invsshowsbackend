-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('PRESENCIAL', 'STREAMING', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "platform" TEXT,
    "externalId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "mode" "EventMode" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "coverImageUrl" TEXT,
    "maxCapacity" INTEGER,
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "muxLiveId" TEXT,
    "streamKey" TEXT,
    "rtmpUrl" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "scannedBy" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "muxAssetId" TEXT NOT NULL,
    "muxPlaybackId" TEXT NOT NULL,
    "duration" INTEGER,
    "thumbnailUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "requiresSubscription" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qrPayload_key" ON "tickets"("qrPayload");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
