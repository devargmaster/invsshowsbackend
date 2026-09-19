-- AlterTable
ALTER TABLE "events" ADD COLUMN     "commerciallyReleased" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: todo evento que ya existía (creado antes de que este campo
-- existiera) queda liberado comercialmente, para no "des-vender" nada que
-- ya estaba a la venta en producción. Solo los eventos NUEVOS a partir de
-- ahora arrancan sin liberar (default false) hasta que el staff los tilde.
UPDATE "events" SET "commerciallyReleased" = true;
