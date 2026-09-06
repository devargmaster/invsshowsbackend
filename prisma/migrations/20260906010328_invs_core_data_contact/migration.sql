-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('FAN', 'ARTISTA', 'CLIENTE', 'PROSPECTO', 'PROVEEDOR', 'PRENSA', 'PARTNER', 'EMBAJADOR', 'AGENTE');

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "fullName" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_role_assignments" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" "ContactRole" NOT NULL,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_userId_key" ON "contacts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_key" ON "contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_phone_key" ON "contacts"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "contact_role_assignments_contactId_role_key" ON "contact_role_assignments"("contactId", "role");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_role_assignments" ADD CONSTRAINT "contact_role_assignments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: ver regla en invs-backend/CLAUDE.md — toda tabla nueva en public
-- necesita esto habilitado para que el linter de seguridad de Supabase no
-- la marque como expuesta vía su Data API (no afecta a Prisma/Railway, que
-- conecta con el rol dueño de las tablas y bypasea RLS).
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_role_assignments" ENABLE ROW LEVEL SECURITY;

-- Backfill: todo User existente pasa a tener su Contact espejo (rol FAN de
-- base, + CLIENTE si ya tiene alguna compra pagada). No migra tickets ni
-- órdenes en sí — eso sigue viviendo en User; Contact solo lo referencia
-- vía userId cuando el service arma la "vista 360" (INVS Graph).
INSERT INTO "contacts" ("id", "userId", "email", "fullName", "source", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "email", "fullName", 'backfill_user_existente', "createdAt", now()
FROM "users";

INSERT INTO "contact_role_assignments" ("id", "contactId", "role", "since")
SELECT gen_random_uuid(), c."id", 'FAN', c."createdAt"
FROM "contacts" c;

INSERT INTO "contact_role_assignments" ("id", "contactId", "role", "since")
SELECT gen_random_uuid(), c."id", 'CLIENTE', now()
FROM "contacts" c
WHERE EXISTS (SELECT 1 FROM "orders" o WHERE o."buyerId" = c."userId" AND o."status" = 'PAID')
   OR EXISTS (SELECT 1 FROM "content_purchases" cp WHERE cp."userId" = c."userId" AND cp."status" = 'PAID')
   OR EXISTS (SELECT 1 FROM "store_purchases" sp WHERE sp."userId" = c."userId" AND sp."status" = 'PAID');
