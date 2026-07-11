-- AlterTable
ALTER TABLE "PersonalityProfile" ADD COLUMN "personalitySubType" TEXT;
ALTER TABLE "PersonalityProfile" ADD COLUMN "personalityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PersonalityProfile" ADD COLUMN "scoreBreakdown" JSONB;

-- AlterTable
ALTER TABLE "InteractionFeedback" ADD COLUMN "conversationDepth" INTEGER;

UPDATE "InteractionFeedback"
SET "conversationDepth" = "wasEngaging"
WHERE "conversationDepth" IS NULL;

ALTER TABLE "InteractionFeedback" ALTER COLUMN "conversationDepth" SET NOT NULL;

ALTER TABLE "InteractionFeedback" DROP COLUMN "feltGenuine";
