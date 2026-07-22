-- AlterTable
ALTER TABLE "events" DROP COLUMN "coverImageUrl";

-- DropTable
-- IF EXISTS a propósito: no está confirmado que el deploy de Railway haya
-- llegado a aplicar la migración original de carousel_photos (GET
-- /api/v1/carousel-photos en producción devuelve 404 pese a que el commit
-- está en origin/main). Puede o no existir en el ambiente donde corra esto.
DROP TABLE IF EXISTS "carousel_photos";

-- CreateTable
CREATE TABLE "event_photos" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_photos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS (convención del repo para toda tabla nueva, ver CLAUDE.md)
ALTER TABLE "event_photos" ENABLE ROW LEVEL SECURITY;
