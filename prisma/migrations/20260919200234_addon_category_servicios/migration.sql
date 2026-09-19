-- CreateEnum
CREATE TYPE "AddonCategory" AS ENUM ('PRODUCTO', 'SERVICIO');

-- AlterTable
ALTER TABLE "addons" ADD COLUMN     "category" "AddonCategory" NOT NULL DEFAULT 'PRODUCTO';
