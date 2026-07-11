import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MatchQueueService } from "./match-queue.service";
import { AnonymousGateway } from "./anonymous.gateway";
import { ReputationService } from "../reputation/reputation.service";
import { assertQuestionnaireComplete } from "../common/questionnaire.util";
import { generateAlias } from "@trustlayer/reputation-engine";
import { interactionFeedbackSchema, RandomCallMode, type StartMatchInput } from "@trustlayer/shared";

@Injectable()
export class AnonymousService {
  private readonly logger = new Logger(AnonymousService.name);
  private readonly sessionTtlMs = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: MatchQueueService,
    private readonly gateway: AnonymousGateway,
    private readonly reputation: ReputationService,
  ) {}

  async startMatch(userId: string, input: StartMatchInput) {
    await assertQuestionnaireComplete(this.prisma, userId);
    const callMode = RandomCallMode.VIDEO;
    const filters = {
      mood: input.mood,
      topic: input.topic,
      language: input.language,
      callMode,
    };

    // Try to pop a waiting session from the queue, skipping any that belong
    // to the caller, are stale, or involve a blocked counterpart.
    for (let i = 0; i < 5; i++) {
      const candidate = await this.queue.pop(filters);
      if (!candidate) break;
      if (candidate.userId === userId) continue;

      const blocked = await this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: candidate.userId },
            { blockerId: candidate.userId, blockedId: userId },
          ],
        },
      });
      if (blocked) continue;

      const session = await this.prisma.anonymousSession.findUnique({
        where: { id: candidate.sessionId },
        include: { participants: true },
      });
      if (!session || session.status !== "WAITING") continue;

      const alias = generateAlias();
      await this.prisma.anonymousSessionParticipant.create({
        data: { sessionId: session.id, userId, alias },
      });
      const updated = await this.prisma.anonymousSession.update({
        where: { id: session.id },
        data: {
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + this.sessionTtlMs),
        },
        include: { participants: true },
      });
      this.gateway.emitSessionActive(session.id);
      return this.serializeSession(updated, userId);
    }

    const alias = generateAlias();
    const session = await this.prisma.anonymousSession.create({
      data: {
        status: "WAITING",
        callMode,
        mood: input.mood,
        topic: input.topic,
        language: input.language,
        participants: { create: { userId, alias } },
      },
      include: { participants: true },
    });
    await this.queue.push(filters, { userId, sessionId: session.id });
    return this.serializeSession(session, userId);
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.anonymousSession.findUnique({
      where: { id: sessionId },
      include: { participants: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!session) throw new NotFoundException();
    this.assertMember(session, userId);
    return this.serializeSession(session, userId);
  }

  async endSession(userId: string, sessionId: string) {
    const session = await this.prisma.anonymousSession.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });
    if (!session) throw new NotFoundException();
    this.assertMember(session, userId);
    if (session.status === "ENDED") {
      this.gateway.emitSessionEnded(sessionId, userId);
      return { ok: true };
    }

    await this.queue.removeBySession(
      {
        mood: session.mood ?? undefined,
        topic: session.topic ?? undefined,
        language: session.language ?? undefined,
        callMode: session.callMode,
      },
      session.id,
    );
    await this.prisma.anonymousSession.update({
      where: { id: session.id },
      data: { status: "ENDED", endedAt: new Date() },
    });
    this.gateway.emitSessionEnded(sessionId, userId);
    return { ok: true };
  }

  async submitFeedback(
    giverId: string,
    sessionId: string,
    raw: unknown,
  ) {
    const parsed = interactionFeedbackSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const session = await this.prisma.anonymousSession.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });
    if (!session) throw new NotFoundException();
    this.assertMember(session, giverId);
    if (session.status !== "ENDED") {
      throw new BadRequestException(
        "Feedback is only available after the chat ends",
      );
    }

    const other = session.participants.find((p) => p.userId !== giverId);
    if (!other) throw new BadRequestException("Session had no counterpart");

    await this.prisma.interactionFeedback.upsert({
      where: {
        sessionId_giverId: { sessionId, giverId },
      },
      update: {
        ...parsed.data,
        receiverId: other.userId,
      },
      create: {
        sessionId,
        giverId,
        receiverId: other.userId,
        ...parsed.data,
      },
    });

    const recentMessages = await this.prisma.anonymousMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { content: true },
    });

    const result = await this.reputation.applyFeedback(
      other.userId,
      parsed.data,
      {
        overallFeeling: parsed.data.overallFeeling,
        mood: session.mood,
        topic: session.topic,
        messageSnippets: recentMessages
          .map((m) => m.content)
          .reverse(),
      },
    );
    return result;
  }

  private assertMember(
    session: { participants: { userId: string }[] },
    userId: string,
  ) {
    if (!session.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException("Not a participant of this session");
    }
  }

  private serializeSession(
    session: {
      id: string;
      status: string;
      callMode?: string;
      mood: string | null;
      topic: string | null;
      createdAt: Date;
      expiresAt: Date | null;
      participants: { userId: string; alias: string }[];
      messages?: { id: string; alias: string; content: string; createdAt: Date }[];
    },
    viewerId: string,
  ) {
    const me = session.participants.find((p) => p.userId === viewerId);
    const partner = session.participants.find((p) => p.userId !== viewerId);
    return {
      id: session.id,
      status: session.status,
      callMode: session.callMode ?? RandomCallMode.TEXT,
      mood: session.mood,
      topic: session.topic,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt?.toISOString() ?? null,
      myAlias: me?.alias ?? null,
      partnerAlias: partner?.alias ?? null,
      messages: (session.messages ?? []).map((m) => ({
        id: m.id,
        alias: m.alias,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        fromMe: me?.alias === m.alias,
      })),
    };
  }
}
