-- Grabaciones con fuente externa (ej. YouTube): los IDs de Mux dejan de ser
-- obligatorios y se agrega videoUrl como fuente alternativa.
ALTER TABLE "recordings" ALTER COLUMN "muxAssetId" DROP NOT NULL;
ALTER TABLE "recordings" ALTER COLUMN "muxPlaybackId" DROP NOT NULL;
ALTER TABLE "recordings" ADD COLUMN "videoUrl" TEXT;
