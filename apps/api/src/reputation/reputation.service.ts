import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  computePersonalityScore,
  computePersonalityScores,
  computeTrustBand,
  computeTrustTier,
  getScoreStrengths,
  initialTagsFromPersonality,
  mergeTagAssignments,
  tagsFromFeedback,
  type AiAssistContext,
  type FeedbackForTags,
  type TagAssignment,
} from "@trustlayer/reputation-engine";
import { LEGACY_TAG_SLUG_MAP, PERSONALITY_SCORE_DIMENSIONS } from "@trustlayer/shared";
import { AiReputationAssistService } from "./ai-reputation-assist.service";

export type FeedbackWithContext = FeedbackForTags & {
  overallFeeling?: string;
};

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAssist: AiReputationAssistService,
  ) {}

  async applyOnboarding(userId: string, answers: Record<string, number>) {
    const scores = computePersonalityScores(answers);
    const breakdown = await this.buildScoreBreakdown(userId, scores.qpScore);

    const profileData = {
      empathyScore: scores.empathyScore,
      opennessScore: scores.opennessScore,
      reliabilityScore: scores.reliabilityScore,
      humorScore: scores.humorScore,
      authenticityScore: scores.authenticityScore,
      communicationStyle: scores.communicationStyle,
      socialEnergy: scores.socialEnergy,
      internalScore: breakdown.personalityScore,
      personalityType: scores.personalityType,
      personalitySubType: scores.personalitySubType,
      personalityScore: breakdown.personalityScore,
      scoreBreakdown: breakdown as object,
      traitPercentages: scores.traitPercentages as object,
      questionnaireComplete: true,
      answers,
    };

    await this.prisma.personalityProfile.upsert({
      where: { userId },
      update: profileData,
      create: { userId, ...profileData },
    });

    await this.persistDimensionScores(userId, breakdown);

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: "STANDARD" },
    });

    const tags = initialTagsFromPersonality(scores);
    await this.applyTags(userId, tags, true);
    return { ...scores, breakdown, strengths: getScoreStrengths(breakdown) };
  }

  async applyFeedback(
    receiverId: string,
    feedback: FeedbackWithContext,
    context: AiAssistContext = {},
  ) {
    const ruleTags = tagsFromFeedback(feedback);
    const assistContext: AiAssistContext = {
      overallFeeling: feedback.overallFeeling ?? context.overallFeeling,
      mood: context.mood,
      topic: context.topic,
      messageSnippets: context.messageSnippets,
    };

    const aiProposals = await this.aiAssist.proposeTags(feedback, assistContext);
    const { merged, fromRules, fromAi } = mergeTagAssignments(
      ruleTags,
      aiProposals,
    );

    await this.applyTags(receiverId, merged);

    const profile = await this.prisma.personalityProfile.findUnique({
      where: { userId: receiverId },
    });
    const qp = this.getQuestionnaireScore(profile);
    const breakdown = await this.buildScoreBreakdown(receiverId, qp);

    await this.prisma.personalityProfile.update({
      where: { userId: receiverId },
      data: {
        personalityScore: breakdown.personalityScore,
        internalScore: breakdown.personalityScore,
        scoreBreakdown: breakdown as object,
      },
    });

    await this.persistDimensionScores(receiverId, breakdown);
    await this.recalcTier(receiverId);

    this.logger.debug(
      `Feedback tags for ${receiverId}: rules=${fromRules.length} ai=${fromAi.length} total=${merged.length}`,
    );

    return {
      tagsAwarded: merged.map((t) => t.slug),
      tagsFromRules: fromRules,
      tagsFromAi: fromAi,
      aiAssistEnabled: this.aiAssist.isLlmEnabled(),
    };
  }

  async retakePersonality(userId: string) {
    await this.prisma.userReputationTag.deleteMany({ where: { userId } });
    await this.prisma.userDimensionScore.deleteMany({ where: { userId } });

    await this.prisma.personalityProfile.update({
      where: { userId },
      data: {
        communicationStyle: null,
        socialEnergy: null,
        empathyScore: 0,
        opennessScore: 0,
        reliabilityScore: 0,
        humorScore: 0,
        authenticityScore: 0,
        internalScore: 0,
        personalityType: null,
        personalitySubType: null,
        personalityScore: 0,
        scoreBreakdown: Prisma.JsonNull,
        traitPercentages: Prisma.JsonNull,
        questionnaireComplete: false,
        answers: Prisma.JsonNull,
      },
    });

    await this.recalcTier(userId);
    return { ok: true };
  }

  async recomputeFromStoredAnswers(userId: string) {
    const profile = await this.prisma.personalityProfile.findUnique({
      where: { userId },
    });
    if (!profile?.questionnaireComplete || !profile.answers) return null;

    const answers = profile.answers as Record<string, number>;
    const scores = computePersonalityScores(answers);
    const breakdown = await this.buildScoreBreakdown(userId, scores.qpScore);

    await this.prisma.personalityProfile.update({
      where: { userId },
      data: {
        personalityType: scores.personalityType,
        personalitySubType: scores.personalitySubType,
        empathyScore: scores.empathyScore,
        opennessScore: scores.opennessScore,
        reliabilityScore: scores.reliabilityScore,
        humorScore: scores.humorScore,
        authenticityScore: scores.authenticityScore,
        communicationStyle: scores.communicationStyle,
        socialEnergy: scores.socialEnergy,
        traitPercentages: scores.traitPercentages as object,
        personalityScore: breakdown.personalityScore,
        internalScore: breakdown.personalityScore,
        scoreBreakdown: breakdown as object,
      },
    });

    await this.persistDimensionScores(userId, breakdown);
    await this.migrateLegacyTags(userId);
    return breakdown;
  }

  async migrateLegacyTags(userId: string) {
    const userTags = await this.prisma.userReputationTag.findMany({
      where: { userId },
      include: { tag: true },
    });

    for (const userTag of userTags) {
      const mapped = LEGACY_TAG_SLUG_MAP[userTag.tag.slug];
      if (!mapped) continue;

      const target = await this.prisma.reputationTag.findUnique({
        where: { slug: mapped },
      });
      if (!target) continue;

      const existing = await this.prisma.userReputationTag.findUnique({
        where: { userId_tagId: { userId, tagId: target.id } },
      });

      if (existing) {
        await this.prisma.userReputationTag.update({
          where: { id: existing.id },
          data: {
            strength: Math.min(1, existing.strength + userTag.strength),
          },
        });
      } else {
        await this.prisma.userReputationTag.create({
          data: {
            userId,
            tagId: target.id,
            strength: userTag.strength,
            earnedAt: userTag.earnedAt,
          },
        });
      }

      await this.prisma.userReputationTag.delete({ where: { id: userTag.id } });
    }
  }

  async getPersonalityPresentation(userId: string) {
    const profile = await this.prisma.personalityProfile.findUnique({
      where: { userId },
    });
    if (!profile) return null;

    const breakdown =
      (profile.scoreBreakdown as {
        qp: number;
        cq: number;
        er: number;
        rc: number;
        cp: number;
        gi: number;
        personalityScore: number;
        band: { label: string; description: string };
      } | null) ??
      (await this.buildScoreBreakdown(userId, profile.reliabilityScore));

    return {
      personalityType: profile.personalityType,
      personalitySubType: profile.personalitySubType,
      personalityScore: profile.personalityScore,
      scoreBreakdown: breakdown,
      strengths: getScoreStrengths(breakdown as Parameters<typeof getScoreStrengths>[0]),
    };
  }

  private getQuestionnaireScore(
    profile: {
      answers?: unknown;
      scoreBreakdown?: unknown;
      reliabilityScore?: number;
    } | null,
  ) {
    if (profile?.answers && typeof profile.answers === "object") {
      const answers = profile.answers as Record<string, number>;
      const scores = computePersonalityScores(answers);
      return scores.qpScore;
    }

    const breakdown = profile?.scoreBreakdown as { qp?: number } | null;
    if (breakdown?.qp != null) return breakdown.qp;
    return profile?.reliabilityScore ?? 50;
  }

  private async buildScoreBreakdown(userId: string, qpScore: number) {
    const [feedback, postCount, commentCount, reportCount, profile] =
      await Promise.all([
        this.prisma.interactionFeedback.findMany({
          where: { receiverId: userId },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.post.count({ where: { authorId: userId, deletedAt: null } }),
        this.prisma.postComment.count({
          where: { authorId: userId, deletedAt: null },
        }),
        this.prisma.report.count({ where: { targetId: userId } }),
        this.prisma.personalityProfile.findUnique({ where: { userId } }),
      ]);

    return computePersonalityScore({
      qp: qpScore,
      reliabilityFromQuestionnaire: profile?.reliabilityScore ?? qpScore,
      feedback: feedback.map((fb) => ({
        feltRespected: fb.feltRespected,
        feltComfortable: fb.feltComfortable,
        wasEngaging: fb.wasEngaging,
        conversationDepth: fb.conversationDepth,
        wouldReconnect: fb.wouldReconnect,
        feltNatural: fb.feltNatural,
        createdAt: fb.createdAt,
      })),
      postCount,
      commentCount,
      reportCount,
      safetyProxy: reportCount === 0 ? 85 : 60,
    });
  }

  private async persistDimensionScores(
    userId: string,
    breakdown: {
      qp: number;
      cq: number;
      er: number;
      rc: number;
      cp: number;
      gi: number;
    },
  ) {
    for (const dimension of Object.keys(
      PERSONALITY_SCORE_DIMENSIONS,
    ) as (keyof typeof PERSONALITY_SCORE_DIMENSIONS)[]) {
      const score = breakdown[dimension];
      await this.prisma.userDimensionScore.upsert({
        where: { userId_dimension: { userId, dimension } },
        update: { score, samples: { increment: 1 } },
        create: { userId, dimension, score, samples: 1 },
      });
    }
  }

  private async applyTags(
    userId: string,
    tags: TagAssignment[],
    replace = false,
  ) {
    if (replace) {
      await this.prisma.userReputationTag.deleteMany({ where: { userId } });
    }
    if (tags.length === 0) return;

    const slugs = tags.map((t) => t.slug);
    const tagRows = await this.prisma.reputationTag.findMany({
      where: { slug: { in: slugs } },
    });
    const bySlug = new Map(tagRows.map((t) => [t.slug, t]));

    for (const t of tags) {
      const tagRow = bySlug.get(t.slug);
      if (!tagRow) {
        this.logger.warn(`Tag slug not in catalog: ${t.slug}`);
        continue;
      }
      const existing = await this.prisma.userReputationTag.findUnique({
        where: { userId_tagId: { userId, tagId: tagRow.id } },
      });
      const nextStrength = replace
        ? t.strengthDelta
        : Math.min(1, (existing?.strength ?? 0) + t.strengthDelta);
      await this.prisma.userReputationTag.upsert({
        where: { userId_tagId: { userId, tagId: tagRow.id } },
        update: { strength: nextStrength },
        create: { userId, tagId: tagRow.id, strength: nextStrength },
      });
    }
  }

  private async recalcTier(userId: string) {
    const positiveCount = await this.prisma.interactionFeedback.count({
      where: {
        receiverId: userId,
        feltRespected: { gte: 4 },
        feltComfortable: { gte: 4 },
      },
    });
    const tagCount = await this.prisma.userReputationTag.count({
      where: { userId, strength: { gte: 0.4 } },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const tier = computeTrustTier({
      positiveFeedbackCount: positiveCount,
      earnedTagCount: tagCount,
      isVerified: user.isVerified,
    });
    const band = computeTrustBand(positiveCount);
    if (tier !== user.trustTier || band !== user.trustBand) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { trustTier: tier, trustBand: band },
      });
    }
  }
}
