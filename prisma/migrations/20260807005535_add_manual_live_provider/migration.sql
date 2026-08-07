-- CreateEnum
CREATE TYPE "ManualLiveProvider" AS ENUM ('YOUTUBE', 'TWITCH');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "manualLiveProvider" "ManualLiveProvider";

