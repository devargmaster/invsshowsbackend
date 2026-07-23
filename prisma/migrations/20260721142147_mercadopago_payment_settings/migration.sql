-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'MERCADOPAGO';

-- AlterTable
ALTER TABLE "content_purchases" ADD COLUMN     "mercadoPagoPaymentId" TEXT,
ADD COLUMN     "mercadoPagoPreferenceId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "mercadoPagoPaymentId" TEXT,
ADD COLUMN     "mercadoPagoPreferenceId" TEXT;

-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "accessTokenCipher" TEXT NOT NULL,
    "publicKey" TEXT,
    "lastFour" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_settings_provider_key" ON "payment_settings"("provider");
