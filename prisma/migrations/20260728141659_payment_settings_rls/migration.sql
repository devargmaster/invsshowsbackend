-- payment_settings quedó sin RLS porque la migración que la creó
-- (20260721142147_mercadopago_payment_settings) no incluyó esta línea,
-- a diferencia de las tablas creadas después. Sin esto, PostgREST expone
-- la tabla completa (incluida accessTokenCipher) vía la Data API de
-- Supabase con la anon key. Igual que el resto de las tablas de public,
-- se habilita sin políticas: Prisma conecta como owner (rol postgres)
-- y bypasea RLS, así que esto no afecta al backend.
ALTER TABLE "payment_settings" ENABLE ROW LEVEL SECURITY;
