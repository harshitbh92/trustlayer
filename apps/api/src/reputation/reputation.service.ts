import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  computePersonalityScores,
  computeReputation,
  computeTrustBand,
  computeTrustTier,
  feedbackAverageToScore,
  initialTagsFromPersonality,
  tagsFromFeedback,
  type FeedbackForTags,
  type TagAssignment,
} from "@trustlayer/reputation-engine";

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply personality answers: persist profile, persist neutral initial tags,
   * promote role to STANDARD. Idempotent.
   */
  async applyOnboarding(
    userId: string,
    answers: Record<string, number>,
  ) {
    const scores = computePersonalityScores(answers);
    const profileData = {
      empathyScore: scores.empathyScore,
      opennessScore: scores.opennessScore,
      reliabilityScore: scores.reliabilityScore,
      humorScore: scores.humorScore,
      authenticityScore: scores.authenticityScore,
      communicationStyle: scores.communicationStyle,
      socialEnergy: scores.socialEnergy,
      internalScore: scores.internalScore,
      personalityType: scores.personalityType,
      traitPercentages: scores.traitPercentages as object,
      questionnaireComplete: true,
      answers,
    };
    await this.prisma.personalityProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: "STANDARD" },
    });

    const tags = initialTagsFromPersonality(scores);
    await this.applyTags(userId, tags);
    return scores;
  }

  /**
   * Apply a single feedback submission: persist new tags with strength bumps,
   * recompute dimension scores, and re-evaluate trust tier/band.
   */
  async applyFeedback(receiverId: string, feedback: FeedbackForTags) {
    const tags = tagsFromFeedback(feedback);
    await this.applyTags(receiverId, tags);

    const fbScore = feedbackAverageToScore(feedback);
    await this.bumpDimensionScore(receiverId, "feedback", fbScore);

    await this.recalcTier(receiverId);
    return { tagsAwarded: tags.map((t) => t.slug) };
  }

  /**
   * Read-side helper used by other services that want the current weighted
   * internal score (never exposed publicly).
   */
  async getInternalScore(userId: string): Promise<number> {
    const dims = await this.prisma.userDimensionScore.findMany({
      where: { userId },
    });
    const map = Object.fromEntries(dims.map((d) => [d.dimension, d.score]));
    const profile = await this.prisma.personalityProfile.findUnique({
      where: { userId },
    });
    const { internalScore } = computeReputation({
      questionnaireScore: profile?.internalScore ?? 0,
      feedbackScore: map.feedback ?? 0,
      postScore: map.posts ?? 0,
      communityScore: map.community ?? 0,
    });
    return internalScore;
  }

  private async applyTags(userId: string, tags: TagAssignment[]) {
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
      const nextStrength = Math.min(
        1,
        (existing?.strength ?? 0) + t.strengthDelta,
      );
      await this.prisma.userReputationTag.upsert({
        where: { userId_tagId: { userId, tagId: tagRow.id } },
        update: { strength: nextStrength },
        create: { userId, tagId: tagRow.id, strength: nextStrength },
      });
    }
  }

  private async bumpDimensionScore(
    userId: string,
    dimension: string,
    newSample: number,
  ) {
    const existing = await this.prisma.userDimensionScore.findUnique({
      where: { userId_dimension: { userId, dimension } },
    });
    if (!existing) {
      await this.prisma.userDimensionScore.create({
        data: { userId, dimension, score: newSample, samples: 1 },
      });
      return;
    }
    const nextSamples = existing.samples + 1;
    const nextScore =
      (existing.score * existing.samples + newSample) / nextSamples;
    await this.prisma.userDimensionScore.update({
      where: { id: existing.id },
      data: { score: nextScore, samples: nextSamples },
    });
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
