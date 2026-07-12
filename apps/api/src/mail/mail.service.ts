import { Injectable, Logger } from "@nestjs/common";
import type { ModerationActionType } from "@prisma/client";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  moderationEmailTemplate,
  resetOtpTemplate,
  signupOtpTemplate,
} from "./email-templates";

export type OtpPurpose = "signup" | "reset";

type NotifiableModerationType = Extract<
  ModerationActionType,
  "WARN" | "SUSPEND" | "BAN"
>;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  isSmtpConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST?.trim());
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST?.trim();
    if (!host) return null;

    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER?.trim();
    // Gmail app passwords are often pasted with spaces; strip them.
    const pass = process.env.SMTP_PASS?.replace(/\s+/g, "") ?? undefined;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      // Railway (and many hosts) cannot reach Gmail over IPv6.
      family: 4,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      auth: user
        ? {
            user,
            pass,
          }
        : undefined,
    });
    return this.transporter;
  }

  private getFromAddress(): string {
    return process.env.SMTP_FROM?.trim() ?? "TrustLayer <noreply@trustlayer.app>";
  }

  private async sendEmail(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    const transport = this.getTransporter();
    if (!transport) return false;

    await transport.sendMail({
      from: this.getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return true;
  }

  async sendOtpEmail(
    to: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<boolean> {
    const rendered =
      purpose === "signup"
        ? signupOtpTemplate(code)
        : resetOtpTemplate(code);

    const transport = this.getTransporter();
    if (!transport) {
      this.logger.log(
        `[OTP] ${purpose} ${to} → ${code} (SMTP not configured — email not sent)`,
      );
      return false;
    }

    try {
      return await this.sendEmail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send ${purpose} email to ${to}: ${message}`);
      // Fall back to logged OTP so signup/reset still work when SMTP is unreachable.
      this.logger.log(
        `[OTP] ${purpose} ${to} → ${code} (SMTP send failed — email not sent)`,
      );
      return false;
    }
  }

  async sendModerationEmail(
    to: string,
    displayName: string,
    type: NotifiableModerationType,
    reason: string,
    expiresAt?: Date | null,
  ): Promise<boolean> {
    const rendered = moderationEmailTemplate(
      type,
      displayName,
      reason,
      expiresAt,
    );

    const transport = this.getTransporter();
    if (!transport) {
      this.logger.log(
        `[MODERATION] ${type} ${to} (SMTP not configured — email not sent)`,
      );
      return false;
    }

    try {
      return await this.sendEmail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send moderation email (${type}) to ${to}: ${message}`,
      );
      return false;
    }
  }
}
