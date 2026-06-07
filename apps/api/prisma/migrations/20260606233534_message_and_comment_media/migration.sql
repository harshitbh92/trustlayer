-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "mediaUrl" TEXT,
ALTER COLUMN "content" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "PostComment" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "videoUrl" TEXT;
