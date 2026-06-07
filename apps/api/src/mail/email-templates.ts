import type { ModerationActionType } from "@prisma/client";
import { getAppUrl, renderEmail, type RenderedEmail } from "./email-layout";

export function signupOtpTemplate(code: string): RenderedEmail {
  return renderEmail("Verify your TrustLayer account", {
    preheader: `Your verification code is ${code}. It expires in 10 minutes.`,
    title: "Verify your email",
    paragraphs: [
      "Welcome to TrustLayer. Enter the verification code below to finish creating your account.",
      "This code expires in 10 minutes. If you did not request this, you can safely ignore this email.",
    ],
    highlight: {
      label: "Verification code",
      value: code,
    },
    cta: {
      label: "Open TrustLayer",
      href: getAppUrl(),
    },
    badge: { label: "Account verification", tone: "info" },
  });
}

export function resetOtpTemplate(code: string): RenderedEmail {
  return renderEmail("Reset your TrustLayer password", {
    preheader: `Your password reset code is ${code}. It expires in 10 minutes.`,
    title: "Reset your password",
    paragraphs: [
      "We received a request to reset your TrustLayer password. Use the code below to continue.",
      "This code expires in 10 minutes. If you did not request a password reset, you can ignore this email and your password will stay the same.",
    ],
    highlight: {
      label: "Reset code",
      value: code,
    },
    cta: {
      label: "Open TrustLayer",
      href: `${getAppUrl()}/reset-password`,
    },
    badge: { label: "Password reset", tone: "info" },
  });
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function moderationWarnTemplate(
  displayName: string,
  reason: string,
): RenderedEmail {
  return renderEmail("Account notice from TrustLayer", {
    preheader: "An account notice has been applied to your TrustLayer profile.",
    title: `Hi ${displayName}, we need to share an account notice`,
    paragraphs: [
      "Our moderation team reviewed activity on your account and applied a warning.",
      "Please review the reason below and make sure your future conversations follow TrustLayer community standards.",
      "This is a notice only — your account remains active.",
    ],
    quote: reason,
    badge: { label: "Warning", tone: "warning" },
    cta: {
      label: "Review community guidelines",
      href: getAppUrl(),
    },
  });
}

export function moderationSuspendTemplate(
  displayName: string,
  reason: string,
  expiresAt: Date,
): RenderedEmail {
  return renderEmail("Your TrustLayer account has been suspended", {
    preheader: "Your TrustLayer account has been temporarily suspended.",
    title: `Hi ${displayName}, your account is temporarily suspended`,
    paragraphs: [
      "Our moderation team reviewed activity on your account and temporarily suspended access.",
      `Your suspension is scheduled to end on ${formatExpiry(expiresAt)}.`,
      "During this time you will not be able to sign in or use TrustLayer.",
    ],
    quote: reason,
    highlight: {
      label: "Suspension ends",
      value: formatExpiry(expiresAt),
    },
    badge: { label: "Suspended", tone: "warning" },
  });
}

export function moderationBanTemplate(
  displayName: string,
  reason: string,
): RenderedEmail {
  return renderEmail("Your TrustLayer account has been restricted", {
    preheader: "Your TrustLayer account access has been permanently restricted.",
    title: `Hi ${displayName}, your account access has been restricted`,
    paragraphs: [
      "Our moderation team reviewed activity on your account and permanently restricted access.",
      "You will no longer be able to sign in or use TrustLayer.",
      "If you believe this was a mistake, contact support through the email address associated with your account.",
    ],
    quote: reason,
    badge: { label: "Restricted", tone: "danger" },
  });
}

export function moderationEmailTemplate(
  type: Extract<ModerationActionType, "WARN" | "SUSPEND" | "BAN">,
  displayName: string,
  reason: string,
  expiresAt?: Date | null,
): RenderedEmail {
  switch (type) {
    case "WARN":
      return moderationWarnTemplate(displayName, reason);
    case "SUSPEND":
      return moderationSuspendTemplate(
        displayName,
        reason,
        expiresAt ?? new Date(),
      );
    case "BAN":
      return moderationBanTemplate(displayName, reason);
  }
}
