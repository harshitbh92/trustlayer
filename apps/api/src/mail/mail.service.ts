import { Injectable, Logger } from "@nestjs/common";
import type { ModerationActionType } from "@prisma/client";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
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

  /** Prefer Resend (HTTPS) — SMTP is blocked on Railway Hobby/Free. */
  isEmailConfigured(): boolean {
    return Boolean(
      process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim(),
    );
  }

  /** @deprecated use isEmailConfigured */
  isSmtpConfigured(): boolean {
    return this.isEmailConfigured();
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST?.trim();
    if (!host) return null;

    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.replace(/\s+/g, "") ?? undefined;
    const options = {
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      family: 4 as const,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      auth: user ? { user, pass } : undefined,
    } as SMTPTransport.Options;
    this.transporter = nodemailer.createTransport(options);
    return this.transporter;
  }

  private getFromAddress(): string {
    return (
      process.env.EMAIL_FROM?.trim() ||
      process.env.SMTP_FROM?.trim() ||
      "TrustLayer <onboarding@resend.dev>"
    );
  }

  private async sendViaResend(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) return false;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.getFromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
    }
    return true;
  }

  private async sendViaSmtp(input: {
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

  private async sendEmail(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    // Resend first — works on Railway Hobby via HTTPS. SMTP only on Pro+.
    if (process.env.RESEND_API_KEY?.trim()) {
      return this.sendViaResend(input);
    }
    return this.sendViaSmtp(input);
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

    if (!this.isEmailConfigured()) {
      this.logger.log(
        `[OTP] ${purpose} ${to} → ${code} (email not configured — not sent)`,
      );
      return false;
    }

    try {
      const sent = await this.sendEmail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      if (sent) {
        this.logger.log(`[OTP] ${purpose} email sent to ${to}`);
      }
      return sent;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send ${purpose} email to ${to}: ${message}`);
      this.logger.log(
        `[OTP] ${purpose} ${to} → ${code} (email send failed — not sent)`,
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

    if (!this.isEmailConfigured()) {
      this.logger.log(
        `[MODERATION] ${type} ${to} (email not configured — not sent)`,
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
