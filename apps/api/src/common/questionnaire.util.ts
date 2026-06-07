import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export async function assertQuestionnaireComplete(
  prisma: PrismaService,
  userId: string,
): Promise<void> {
  const profile = await prisma.personalityProfile.findUnique({
    where: { userId },
    select: { questionnaireComplete: true },
  });
  if (!profile?.questionnaireComplete) {
    throw new ForbiddenException(
      "Complete the personality questionnaire to use this feature",
    );
  }
}
