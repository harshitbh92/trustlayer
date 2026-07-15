import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { ReportStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  publicUserInclude,
  toPublicUser,
} from "../common/public-user.mapper";
import { MailService } from "../mail/mail.service";
import type {
  CreateModerationActionInput,
  UpdateReportStatusInput,
} from "@trustlayer/shared";
import { PERSONALITY_SCORE_BANDS } from "@trustlayer/shared";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDayKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

function fillDaySeries(
  keys: string[],
  rows: { createdAt: Date }[],
): { date: string; count: number }[] {
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const row of rows) {
    const k = dayKey(row.createdAt);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async getStats() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      openReports,
      reportsLast7Days,
      totalBlocks,
      moderationLast7Days,
      activeSessions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.report.count({ where: { status: "OPEN" } }),
      this.prisma.report.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.block.count(),
      this.prisma.moderationAction.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      this.prisma.anonymousSession.count({ where: { status: "ACTIVE" } }),
    ]);

    return {
      totalUsers,
      openReports,
      reportsLast7Days,
      totalBlocks,
      moderationLast7Days,
      activeSessions,
    };
  }

  async getAnalytics() {
    const days14 = lastNDayKeys(14);
    const start14 = new Date(`${days14[0]}T00:00:00.000Z`);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      signupRows,
      questionnaireComplete,
      questionnaireIncomplete,
      reportStatusGroups,
      reportDayRows,
      moderationTypeGroups,
      acceptedConnections,
      pendingConnections,
      messagesLast7Days,
      anonymousSessionsLast7Days,
      anonymousActive,
      feedbackLast7Days,
      scoreAgg,
      scoreRows,
      typeGroups,
      signupsLast7Days,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: start14 } },
        select: { createdAt: true },
      }),
      this.prisma.personalityProfile.count({
        where: { questionnaireComplete: true },
      }),
      this.prisma.personalityProfile.count({
        where: { questionnaireComplete: false },
      }),
      this.prisma.report.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.report.findMany({
        where: { createdAt: { gte: start14 } },
        select: { createdAt: true },
      }),
      this.prisma.moderationAction.groupBy({
        by: ["type"],
        _count: { _all: true },
      }),
      this.prisma.connection.count({ where: { status: "ACCEPTED" } }),
      this.prisma.connection.count({ where: { status: "PENDING" } }),
      this.prisma.message.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.anonymousSession.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      this.prisma.anonymousSession.count({ where: { status: "ACTIVE" } }),
      this.prisma.interactionFeedback.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      this.prisma.personalityProfile.aggregate({
        _avg: { personalityScore: true },
        _count: { _all: true },
      }),
      this.prisma.personalityProfile.findMany({
        select: { personalityScore: true },
      }),
      this.prisma.personalityProfile.groupBy({
        by: ["personalityType"],
        where: { personalityType: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { personalityType: "desc" } },
        take: 8,
      }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    const reportsByStatus: Record<string, number> = {
      OPEN: 0,
      REVIEWED: 0,
      ACTIONED: 0,
      DISMISSED: 0,
    };
    for (const g of reportStatusGroups) {
      reportsByStatus[g.status] = g._count._all;
    }

    const moderationByType: Record<string, number> = {
      WARN: 0,
      SHADOWBAN: 0,
      SUSPEND: 0,
      BAN: 0,
    };
    for (const g of moderationTypeGroups) {
      moderationByType[g.type] = g._count._all;
    }

    const scoreBands = PERSONALITY_SCORE_BANDS.map((band) => ({
      label: band.label,
      min: band.min,
      max: band.max,
      count: scoreRows.filter((r) => {
        const s = Math.round(r.personalityScore);
        return s >= band.min && s <= band.max;
      }).length,
    }));

    return {
      growth: {
        signupsByDay: fillDaySeries(days14, signupRows),
        signupsLast7Days,
        questionnaireComplete,
        questionnaireIncomplete,
      },
      safety: {
        reportsByStatus,
        reportsByDay: fillDaySeries(days14, reportDayRows),
        moderationByType,
      },
      engagement: {
        acceptedConnections,
        pendingConnections,
        messagesLast7Days,
        anonymousSessionsLast7Days,
        anonymousActive,
        feedbackLast7Days,
      },
      personality: {
        avgPersonalityScore:
          scoreAgg._avg.personalityScore != null
            ? Math.round(scoreAgg._avg.personalityScore * 10) / 10
            : null,
        profilesCounted: scoreAgg._count._all,
        scoreBands,
        topPersonalityTypes: typeGroups.map((g) => ({
          type: g.personalityType ?? "Unknown",
          count: g._count._all,
        })),
      },
    };
  }

  async listReports(status?: ReportStatus) {
    const rows = await this.prisma.report.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { include: publicUserInclude },
        target: { include: publicUserInclude },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      context: r.context,
      sessionId: r.sessionId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      reporter: toPublicUser(r.reporter),
      target: toPublicUser(r.target),
    }));
  }

  async updateReportStatus(reportId: string, input: UpdateReportStatusInput) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException("Report not found");

    const reviewedAt =
      input.status === "REVIEWED" ||
      input.status === "ACTIONED" ||
      input.status === "DISMISSED"
        ? new Date()
        : report.reviewedAt;

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: input.status,
        reviewedAt,
      },
    });
  }

  async createModerationAction(
    actorId: string,
    input: CreateModerationActionInput,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: input.targetUserId },
    });
    if (!target) throw new NotFoundException("Target user not found");
    if (target.id === actorId) {
      throw new BadRequestException("Cannot moderate yourself");
    }

    if (input.type === "SUSPEND" && !input.expiresAt) {
      throw new BadRequestException("Suspensions require an expiry date");
    }

    if (input.reportId) {
      const report = await this.prisma.report.findUnique({
        where: { id: input.reportId },
      });
      if (!report) throw new NotFoundException("Report not found");
    }

    const action = await this.prisma.moderationAction.create({
      data: {
        targetId: input.targetUserId,
        actorId,
        type: input.type,
        reason: input.reason,
        reportId: input.reportId ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    if (input.reportId) {
      await this.prisma.report.update({
        where: { id: input.reportId },
        data: { status: "ACTIONED", reviewedAt: new Date() },
      });
    }

    if (
      input.type === "WARN" ||
      input.type === "SUSPEND" ||
      input.type === "BAN"
    ) {
      const sent = await this.mail.sendModerationEmail(
        target.email,
        target.displayName,
        input.type,
        input.reason,
        action.expiresAt,
      );
      if (!sent && this.mail.isSmtpConfigured()) {
        this.logger.warn(
          `Moderation action ${action.id} saved but email to ${target.email} failed`,
        );
      }
    }

    return action;
  }

  async listModerationActions(limit = 50) {
    const actions = await this.prisma.moderationAction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const userIds = [
      ...new Set(actions.flatMap((a) => [a.targetId, a.actorId])),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return actions.map((a) => ({
      id: a.id,
      type: a.type,
      reason: a.reason,
      reportId: a.reportId,
      expiresAt: a.expiresAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      target: byId.get(a.targetId) ?? {
        id: a.targetId,
        username: "unknown",
        displayName: "Unknown",
      },
      actor: byId.get(a.actorId) ?? {
        id: a.actorId,
        username: "unknown",
        displayName: "Unknown",
      },
    }));
  }

  async searchUsers(query?: string) {
    const where = query?.trim()
      ? {
          OR: [
            { username: { contains: query.trim(), mode: "insensitive" as const } },
            { email: { contains: query.trim(), mode: "insensitive" as const } },
            { displayName: { contains: query.trim(), mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const users = await this.prisma.user.findMany({
      where,
      include: publicUserInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const reportCounts = await this.prisma.report.groupBy({
      by: ["targetId"],
      where: { targetId: { in: users.map((u) => u.id) } },
      _count: { _all: true },
    });
    const reportsByTarget = new Map(
      reportCounts.map((r) => [r.targetId, r._count._all]),
    );

    return users.map((u) => ({
      ...toPublicUser(u),
      email: u.email,
      reportCount: reportsByTarget.get(u.id) ?? 0,
    }));
  }

  async updateUserRole(userId: string, role: UserRole, actorId: string) {
    if (userId === actorId && role !== "ADMIN") {
      throw new BadRequestException("Cannot demote yourself");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      include: publicUserInclude,
    });
    return toPublicUser(updated);
  }

  async deleteUser(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new BadRequestException("Cannot delete your own account");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException("User not found");
    if (target.role === "ADMIN") {
      throw new BadRequestException("Cannot delete admin accounts");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.moderationAction.deleteMany({
        where: { OR: [{ targetId }, { actorId: targetId }] },
      });
      await tx.aIModerationFlag.deleteMany({ where: { userId: targetId } });
      await tx.reputationSnapshot.deleteMany({ where: { userId: targetId } });
      await tx.matchSuggestion.deleteMany({
        where: { OR: [{ userId: targetId }, { targetId }] },
      });
      await tx.notification.deleteMany({ where: { userId: targetId } });
      await tx.userVerification.deleteMany({ where: { userId: targetId } });
      await tx.userRiskProfile.deleteMany({ where: { userId: targetId } });
      await tx.compatibilityProfile.deleteMany({ where: { userId: targetId } });
      await tx.matchPreference.deleteMany({ where: { userId: targetId } });
      await tx.publicThread.deleteMany({ where: { authorId: targetId } });
      await tx.reconnectRequest.deleteMany({
        where: { OR: [{ fromUserId: targetId }, { toUserId: targetId }] },
      });
      await tx.user.delete({ where: { id: targetId } });
    });

    return { ok: true };
  }
}
