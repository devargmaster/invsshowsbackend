-- CreateEnum
CREATE TYPE "LandingStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "landings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "LandingStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoOgImage" TEXT,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "customCss" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landings_slug_key" ON "landings"("slug");

