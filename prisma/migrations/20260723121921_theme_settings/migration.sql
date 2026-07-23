-- CreateTable
CREATE TABLE "theme_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "colorBg" TEXT NOT NULL DEFAULT '#0B0B12',
    "colorSurface" TEXT NOT NULL DEFAULT '#13131F',
    "colorBorder" TEXT NOT NULL DEFAULT '#1E1E33',
    "colorAccent" TEXT NOT NULL DEFAULT '#A78BFA',
    "colorAccentHover" TEXT NOT NULL DEFAULT '#8B5CF6',
    "colorText" TEXT NOT NULL DEFAULT '#F0F0F5',
    "colorTextSecondary" TEXT NOT NULL DEFAULT '#C4C4D4',
    "colorTextMuted" TEXT NOT NULL DEFAULT '#8F8FA3',
    "colorSuccess" TEXT NOT NULL DEFAULT '#22C55E',
    "colorDanger" TEXT NOT NULL DEFAULT '#EF4444',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_settings_pkey" PRIMARY KEY ("id")
);

-- Enable RLS (convención del repo para toda tabla nueva, ver CLAUDE.md)
ALTER TABLE "theme_settings" ENABLE ROW LEVEL SECURITY;
