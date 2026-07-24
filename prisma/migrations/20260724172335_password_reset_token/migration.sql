-- AlterTable
ALTER TABLE "users" ADD COLUMN "passwordResetToken" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
