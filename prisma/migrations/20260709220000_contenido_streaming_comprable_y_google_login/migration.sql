-- AlterTable
ALTER TABLE "events" ADD COLUMN     "liveCurrency" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN     "liveIncludedInSubscription" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "liveIsFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "livePriceCents" INTEGER;

-- AlterTable
ALTER TABLE "recordings" DROP COLUMN "isPublic",
DROP COLUMN "requiresSubscription",
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN     "includedInSubscription" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceCents" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleId" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "content_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordingId" TEXT,
    "eventId" TEXT,
    "status" "OrderStatus" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "transferProofUrl" TEXT,
    "transferReference" TEXT,
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "openpayChargeId" TEXT,
    "paymentError" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- AddForeignKey
ALTER TABLE "content_purchases" ADD CONSTRAINT "content_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_purchases" ADD CONSTRAINT "content_purchases_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_purchases" ADD CONSTRAINT "content_purchases_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_purchases" ADD CONSTRAINT "content_purchases_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Exactamente uno de recordingId/eventId debe estar seteado (Prisma no
-- soporta CHECK constraints en el DSL, se agrega a mano).
ALTER TABLE "content_purchases" ADD CONSTRAINT "content_purchase_target_check"
  CHECK ((("recordingId" IS NOT NULL)::int + ("eventId" IS NOT NULL)::int) = 1);

-- Evita comprar dos veces lo mismo una vez ya pagado (sí permite reintentar
-- después de un intento CANCELLED/FAILED) — mismo truco de índice único
-- parcial ya usado en ticket_transfers_ticket_pending_unique.
CREATE UNIQUE INDEX "content_purchases_user_recording_paid_unique"
  ON "content_purchases" ("userId", "recordingId") WHERE "status" = 'PAID' AND "recordingId" IS NOT NULL;

CREATE UNIQUE INDEX "content_purchases_user_event_paid_unique"
  ON "content_purchases" ("userId", "eventId") WHERE "status" = 'PAID' AND "eventId" IS NOT NULL;
