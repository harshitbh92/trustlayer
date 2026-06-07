/*
  Warnings:

  - You are about to drop the column `supabaseId` on the `User` table. All the data in the column will be lost.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "User_supabaseId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "supabaseId",
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL;
