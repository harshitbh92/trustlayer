-- CreateEnum
CREATE TYPE "DiscoverLayout" AS ENUM ('GRID', 'DATING_STACK', 'SWIPE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "discoverLayout" "DiscoverLayout" NOT NULL DEFAULT 'DATING_STACK';
