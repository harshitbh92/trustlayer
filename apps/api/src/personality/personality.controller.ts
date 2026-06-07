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
import { computePublicPersonalityScore } from "./personality.util";

function toPublicPersonalityDashboard(
  pp: {
    personalityType: string | null;
    communicationStyle: string | null;
    socialEnergy: string | null;
    traitPercentages: unknown;
    questionnaireComplete: boolean;
  } | null,
) {
  if (!pp) {
    return {
      personalityType: null,
      communicationStyle: null,
      socialEnergy: null,
      traitPercentages: null,
      questionnaireComplete: false,
      publicScore: 0,
    };
  }

  const traitPercentages = pp.questionnaireComplete
    ? ((pp.traitPercentages as Record<string, number> | null) ?? null)
    : null;

  return {
    personalityType: pp.personalityType,
    communicationStyle: pp.communicationStyle,
    socialEnergy: pp.socialEnergy,
    traitPercentages,
    questionnaireComplete: pp.questionnaireComplete,
    publicScore: computePublicPersonalityScore(traitPercentages),
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
    return this.prisma.personalityProfile.findUnique({
      where: { userId: user.id },
    });
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
    const scores = await this.reputation.applyOnboarding(user.id, body.answers);
    return {
      scores: {
        personalityType: scores.personalityType,
        traitPercentages: scores.traitPercentages,
        communicationStyle: scores.communicationStyle,
        socialEnergy: scores.socialEnergy,
      },
    };
  }
}
