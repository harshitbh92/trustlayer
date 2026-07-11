import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { RedisService } from "../redis/redis.service";
import { MailService, type OtpPurpose } from "./mail.service";

const BCRYPT_ROUNDS = 10;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

export interface SignupOtpPayload {
  username: string;
  displayName: string;
  passwordHash: string;
}

interface StoredOtp {
  codeHash: string;
  attempts: number;
  payload?: SignupOtpPayload;
}

@Injectable()
export class OtpService {
  constructor(
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  private ttlSeconds(): number {
    return Number(process.env.OTP_TTL_SECONDS ?? 600);
  }

  private otpKey(purpose: OtpPurpose, email: string): string {
    return `otp:${purpose}:${email.toLowerCase()}`;
  }

  private cooldownKey(purpose: OtpPurpose, email: string): string {
    return `otp:cooldown:${purpose}:${email.toLowerCase()}`;
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async sendSignupOtp(
    email: string,
    payload: SignupOtpPayload,
  ): Promise<{ emailSent: boolean; devCode?: string }> {
    return this.sendOtp("signup", email, payload);
  }

  async sendResetOtp(
    email: string,
  ): Promise<{ emailSent: boolean; devCode?: string }> {
    return this.sendOtp("reset", email);
  }

  private async sendOtp(
    purpose: OtpPurpose,
    email: string,
    payload?: SignupOtpPayload,
  ): Promise<{ emailSent: boolean; devCode?: string }> {
    const normalized = email.toLowerCase().trim();
    const cooldown = await this.redis.client.get(
      this.cooldownKey(purpose, normalized),
    );
    if (cooldown) {
      throw new HttpException(
        "Please wait before requesting another code",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const stored: StoredOtp = { codeHash, attempts: 0, payload };
    const ttl = this.ttlSeconds();

    await this.redis.client
      .multi()
      .set(this.otpKey(purpose, normalized), JSON.stringify(stored), "EX", ttl)
      .set(this.cooldownKey(purpose, normalized), "1", "EX", COOLDOWN_SECONDS)
      .exec();

    const emailSent = await this.mail.sendOtpEmail(normalized, code, purpose);
    // When SMTP is not configured, surface the code so signup/reset still works
    // in early deployments (and local). Never return the code if email was sent.
    const devCode = !emailSent ? code : undefined;
    return { emailSent, devCode };
  }

  async verifySignupOtp(
    email: string,
    code: string,
  ): Promise<SignupOtpPayload> {
    const stored = await this.verifyOtp("signup", email, code);
    if (!stored.payload) {
      throw new BadRequestException("Signup session expired. Please start again.");
    }
    return stored.payload;
  }

  async verifyResetOtp(email: string, code: string): Promise<void> {
    await this.verifyOtp("reset", email, code);
  }

  private async verifyOtp(
    purpose: OtpPurpose,
    email: string,
    code: string,
  ): Promise<StoredOtp> {
    const normalized = email.toLowerCase().trim();
    const key = this.otpKey(purpose, normalized);
    const raw = await this.redis.client.get(key);
    if (!raw) {
      throw new BadRequestException("Code expired or not found. Request a new one.");
    }

    const stored = JSON.parse(raw) as StoredOtp;
    if (stored.attempts >= MAX_ATTEMPTS) {
      await this.redis.client.del(key);
      throw new BadRequestException("Too many attempts. Request a new code.");
    }

    const ok = await bcrypt.compare(code, stored.codeHash);
    if (!ok) {
      stored.attempts += 1;
      const ttl = await this.redis.client.ttl(key);
      if (ttl > 0) {
        await this.redis.client.set(key, JSON.stringify(stored), "EX", ttl);
      }
      throw new BadRequestException("Invalid verification code");
    }

    await this.redis.client.del(key);
    return stored;
  }
}
