-- AlterTable
ALTER TABLE "User" ALTER COLUMN "discoverLayout" SET DEFAULT 'GRID';

-- Reset users who still have the old default (they can opt into dating layouts in Settings)
UPDATE "User" SET "discoverLayout" = 'GRID' WHERE "discoverLayout" = 'DATING_STACK';
