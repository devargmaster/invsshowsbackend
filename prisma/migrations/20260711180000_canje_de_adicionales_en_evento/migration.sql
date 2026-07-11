-- Canje de adicionales en el evento: cuántas unidades de cada adicional de
-- la orden ya fueron entregadas (lo marca el staff desde el scanner).
ALTER TABLE "order_addons" ADD COLUMN "redeemedCount" INTEGER NOT NULL DEFAULT 0;
