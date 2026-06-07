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
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
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
      throw err;
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
