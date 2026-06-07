import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt.guard";
import { CurrentUser } from "./current-user.decorator";
import { AuthService } from "./auth.service";
import { omitPasswordHash } from "./auth.util";
import { PrismaService } from "../prisma/prisma.service";
import {
  publicUserInclude,
  toPublicUser,
} from "../common/public-user.mapper";
import { ZodPipe } from "../common/zod.pipe";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type VerifyOtpInput,
} from "@trustlayer/shared";
import type { User } from "@prisma/client";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("register/request-otp")
  @HttpCode(200)
  async requestSignupOtp(
    @Body(new ZodPipe(registerSchema)) body: RegisterInput,
  ) {
    return this.auth.requestSignupOtp(body);
  }

  @Post("register/verify-otp")
  async verifySignupOtp(
    @Body(new ZodPipe(verifyOtpSchema)) body: VerifyOtpInput,
  ) {
    const { token, user } = await this.auth.verifySignupOtp(body);
    return { token, user: omitPasswordHash(user) };
  }

  @Post("register")
  async register(@Body(new ZodPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body(new ZodPipe(loginSchema)) body: LoginInput) {
    const { token, user } = await this.auth.login(body);
    return { token, user: omitPasswordHash(user) };
  }

  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(
    @Body(new ZodPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ) {
    return this.auth.forgotPassword(body);
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(
    @Body(new ZodPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ) {
    return this.auth.resetPassword(body);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    const full = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: publicUserInclude,
    });
    if (!full) return { user: null };
    return {
      user: {
        ...toPublicUser(full),
        birthDate: full.birthDate?.toISOString().slice(0, 10) ?? null,
        addressLine: full.addressLine ?? null,
        discoverLayout: full.discoverLayout,
        personalityProfile: full.personalityProfile
          ? {
              questionnaireComplete:
                full.personalityProfile.questionnaireComplete,
            }
          : null,
      },
    };
  }
}
