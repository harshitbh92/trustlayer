import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ReputationService } from "../reputation/reputation.service";
import { ZodPipe } from "../common/zod.pipe";
import { PrismaService } from "../prisma/prisma.service";
import {
  PERSONALITY_QUESTIONS,
  submitPersonalitySchema,
  type SubmitPersonalityInput,
} from "@trustlayer/shared";
import type { User } from "@prisma/client";
import { z } from "zod";

const retakePersonalitySchema = z.object({
  confirm: z.literal(true),
});

function toPublicPersonalityDashboard(
  pp: {
    personalityType: string | null;
    personalitySubType: string | null;
    personalityScore: number;
    communicationStyle: string | null;
    socialEnergy: string | null;
    traitPercentages: unknown;
    questionnaireComplete: boolean;
    scoreBreakdown: unknown;
  } | null,
) {
  if (!pp) {
    return {
      personalityType: null,
      personalitySubType: null,
      personalityScore: 0,
      communicationStyle: null,
      socialEnergy: null,
      traitPercentages: null,
      questionnaireComplete: false,
      publicScore: 0,
      scoreBreakdown: null,
    };
  }

  const traitPercentages = pp.questionnaireComplete
    ? ((pp.traitPercentages as Record<string, number> | null) ?? null)
    : null;

  return {
    personalityType: pp.personalityType,
    personalitySubType: pp.personalitySubType,
    personalityScore: pp.personalityScore,
    communicationStyle: pp.communicationStyle,
    socialEnergy: pp.socialEnergy,
    traitPercentages,
    questionnaireComplete: pp.questionnaireComplete,
    publicScore: pp.personalityScore,
    scoreBreakdown: pp.scoreBreakdown,
  };
}

@Controller("personality")
export class PersonalityController {
  constructor(
    private readonly reputation: ReputationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("questions")
  questions() {
    return { questions: PERSONALITY_QUESTIONS };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async myProfile(@CurrentUser() user: User) {
    let profile = await this.prisma.personalityProfile.findUnique({
      where: { userId: user.id },
    });
    if (
      profile?.questionnaireComplete &&
      (!profile.personalitySubType || profile.personalityScore === 0)
    ) {
      await this.reputation.recomputeFromStoredAnswers(user.id);
      profile = await this.prisma.personalityProfile.findUnique({
        where: { userId: user.id },
      });
    }
    if (!profile) return null;

    const presentation = await this.reputation.getPersonalityPresentation(
      user.id,
    );

    return {
      ...profile,
      presentation,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("user/:username")
  async userProfile(@Param("username") username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { personalityProfile: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return toPublicPersonalityDashboard(user.personalityProfile);
  }

  @UseGuards(JwtAuthGuard)
  @Post("submit")
  async submit(
    @CurrentUser() user: User,
    @Body(new ZodPipe(submitPersonalitySchema)) body: SubmitPersonalityInput,
  ) {
    const result = await this.reputation.applyOnboarding(user.id, body.answers);
    return {
      scores: {
        personalityType: result.personalityType,
        personalitySubType: result.personalitySubType,
        traitPercentages: result.traitPercentages,
        communicationStyle: result.communicationStyle,
        socialEnergy: result.socialEnergy,
        personalityScore: result.breakdown.personalityScore,
        scoreBand: result.breakdown.band,
        strengths: result.strengths,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("retake")
  async retake(
    @CurrentUser() user: User,
    @Body(new ZodPipe(retakePersonalitySchema)) _body: { confirm: true },
  ) {
    return this.reputation.retakePersonality(user.id);
  }
}
