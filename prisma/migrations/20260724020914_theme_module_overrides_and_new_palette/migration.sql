-- CreateEnum
CREATE TYPE "ThemeModule" AS ENUM ('EVENTS', 'STREAMING');

-- AlterTable
ALTER TABLE "theme_settings" ALTER COLUMN "colorBg" SET DEFAULT '#0B0C0E',
ALTER COLUMN "colorSurface" SET DEFAULT '#15171A',
ALTER COLUMN "colorBorder" SET DEFAULT '#30343A',
ALTER COLUMN "colorAccent" SET DEFAULT '#D9F5F8',
ALTER COLUMN "colorAccentHover" SET DEFAULT '#F4FEFF',
ALTER COLUMN "colorText" SET DEFAULT '#F4F4F2',
ALTER COLUMN "colorTextSecondary" SET DEFAULT '#B8BBC0',
ALTER COLUMN "colorTextMuted" SET DEFAULT '#7C8188',
ALTER COLUMN "colorSuccess" SET DEFAULT '#3DCC8C',
ALTER COLUMN "colorDanger" SET DEFAULT '#FF626A';

-- CreateTable
CREATE TABLE "theme_module_overrides" (
    "id" TEXT NOT NULL,
    "module" "ThemeModule" NOT NULL,
    "colorBg" TEXT,
    "colorSurface" TEXT,
    "colorBorder" TEXT,
    "colorAccent" TEXT,
    "colorAccentHover" TEXT,
    "colorText" TEXT,
    "colorTextSecondary" TEXT,
    "colorTextMuted" TEXT,
    "colorSuccess" TEXT,
    "colorDanger" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_module_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "theme_module_overrides_module_key" ON "theme_module_overrides"("module");

-- RowLevelSecurity
ALTER TABLE "theme_module_overrides" ENABLE ROW LEVEL SECURITY;
