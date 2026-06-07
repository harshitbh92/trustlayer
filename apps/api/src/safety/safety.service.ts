import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { publicUserInclude, toPublicUser } from "../common/public-user.mapper";
import type { CreateReportInput } from "@trustlayer/shared";

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async block(userId: string, blockedUsername: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: blockedUsername },
    });
    if (!target) throw new NotFoundException("User not found");
    if (target.id === userId) {
      throw new BadRequestException("Cannot block yourself");
    }
    await this.prisma.block.upsert({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: target.id },
      },
      update: {},
      create: { blockerId: userId, blockedId: target.id },
    });
    return { blocked: true };
  }

  async unblock(userId: string, blockedUsername: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: blockedUsername },
    });
    if (!target) return { blocked: false };
    await this.prisma.block
      .delete({
        where: {
          blockerId_blockedId: { blockerId: userId, blockedId: target.id },
        },
      })
      .catch(() => undefined);
    return { blocked: false };
  }

  async listBlocks(userId: string) {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { include: publicUserInclude } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      user: toPublicUser(r.blocked),
    }));
  }

  async report(reporterId: string, input: CreateReportInput) {
    if (input.targetUserId === reporterId) {
      throw new BadRequestException("Cannot report yourself");
    }
    const target = await this.prisma.user.findUnique({
      where: { id: input.targetUserId },
    });
    if (!target) throw new NotFoundException("Target not found");
    return this.prisma.report.create({
      data: {
        reporterId,
        targetId: target.id,
        reason: input.reason,
        context: input.context ?? null,
        sessionId: input.sessionId ?? null,
      },
    });
  }
}
