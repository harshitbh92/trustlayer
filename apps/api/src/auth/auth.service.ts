import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { OtpService } from "../mail/otp.service";
import { signToken } from "./jwt.util";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyOtpInput,
} from "@trustlayer/shared";

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
  ) {}

  async requestSignupOtp(input: RegisterInput) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
    });
    if (existing?.email === input.email) {
      throw new ConflictException("Email already registered");
    }
    if (existing?.username === input.username) {
      throw new ConflictException("Username already taken");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const { emailSent, devCode } = await this.otp.sendSignupOtp(input.email, {
      username: input.username,
      displayName: input.displayName,
      passwordHash,
    });
    return { ok: true, emailSent, devCode };
  }

  async verifySignupOtp(input: VerifyOtpInput) {
    const payload = await this.otp.verifySignupOtp(input.email, input.code);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: payload.username }],
      },
    });
    if (existing) {
      throw new ConflictException("Account already exists");
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        passwordHash: payload.passwordHash,
        username: payload.username,
        displayName: payload.displayName,
        role: "GUEST",
        personalityProfile: { create: {} },
      },
      include: {
        personalityProfile: true,
        reputationTags: { include: { tag: true } },
      },
    });

    const token = signToken({ userId: user.id, email: user.email });
    return { token, user };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
      include: {
        personalityProfile: true,
        reputationTags: { include: { tag: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const token = signToken({ userId: user.id, email: user.email });
    return { token, user };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const email = input.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    let emailSent = true;
    let devCode: string | undefined;
    if (user) {
      ({ emailSent, devCode } = await this.otp.sendResetOtp(email));
    }
    return { ok: true, emailSent, devCode };
  }

  async resetPassword(input: ResetPasswordInput) {
    const email = input.email.toLowerCase().trim();
    await this.otp.verifyResetOtp(email, input.code);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException("Account not found");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return { ok: true };
  }

  /** @deprecated Use requestSignupOtp + verifySignupOtp */
  async register(_input: RegisterInput) {
    throw new BadRequestException(
      "Direct registration is disabled. Use POST /auth/register/request-otp and /auth/register/verify-otp.",
    );
  }
}
