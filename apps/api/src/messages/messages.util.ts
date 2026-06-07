import { ForbiddenException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";

export async function assertUsersConnected(
  prisma: PrismaService,
  userA: string,
  userB: string,
): Promise<void> {
  const connection = await prisma.connection.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userA, receiverId: userB },
        { requesterId: userB, receiverId: userA },
      ],
    },
  });
  if (!connection) {
    throw new ForbiddenException("You must be connected to message this user");
  }
}

export async function assertNotBlocked(
  prisma: PrismaService,
  userA: string,
  userB: string,
): Promise<void> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
  });
  if (block) {
    throw new ForbiddenException("Cannot message this user");
  }
}

export async function assertCanMessage(
  prisma: PrismaService,
  senderId: string,
  targetUserId: string,
): Promise<void> {
  if (senderId === targetUserId) {
    throw new ForbiddenException("Cannot message yourself");
  }
  await assertNotBlocked(prisma, senderId, targetUserId);
  await assertUsersConnected(prisma, senderId, targetUserId);
}
