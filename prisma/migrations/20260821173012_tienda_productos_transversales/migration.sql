/*
  Warnings:

  - You are about to drop the column `eventId` on the `addons` table. Se
    preserva migrando cada fila existente a la nueva tabla puente
    `addon_event_links` antes de dropear la columna (ver INSERT abajo).

*/

-- CreateTable (antes del DROP COLUMN para poder migrar los datos)
CREATE TABLE "addon_event_links" (
    "id" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "addon_event_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "addon_event_links_addonId_eventId_key" ON "addon_event_links"("addonId", "eventId");

-- AddForeignKey
ALTER TABLE "addon_event_links" ADD CONSTRAINT "addon_event_links_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "addons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_event_links" ADD CONSTRAINT "addon_event_links_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: cada AddOn existente tenía exactamente un evento (columna
-- eventId NOT NULL) — se preserva como su primer vínculo en la tabla puente.
INSERT INTO "addon_event_links" ("id", "addonId", "eventId")
SELECT gen_random_uuid()::text, "id", "eventId" FROM "addons";

-- DropForeignKey
ALTER TABLE "addons" DROP CONSTRAINT "addons_eventId_fkey";

-- AlterTable
ALTER TABLE "addons" DROP COLUMN "eventId",
ADD COLUMN     "showInStore" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "store_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
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
    "mercadoPagoPreferenceId" TEXT,
    "mercadoPagoPaymentId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_purchases_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "addons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "addon_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: tablas nuevas quedan expuestas al linter de seguridad de Supabase si
-- no se habilita esto (Prisma sigue funcionando igual, conecta con el rol
-- "postgres" que bypasea RLS — ver nota en el resto de migraciones nuevas).
ALTER TABLE "addon_event_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_purchases" ENABLE ROW LEVEL SECURITY;
