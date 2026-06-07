export interface EmailContent {
  preheader: string;
  title: string;
  paragraphs: string[];
  highlight?: { label: string; value: string };
  quote?: string;
  cta?: { label: string; href: string };
  badge?: { label: string; tone: "info" | "warning" | "danger" };
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BADGE_COLORS = {
  info: { bg: "#e8ebff", text: "#3b46a8", border: "#8b9cff" },
  warning: { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" },
  danger: { bg: "#fee2e2", text: "#991b1b", border: "#ef4444" },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getAppUrl(): string {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/$/, "");
  const cors = process.env.CORS_ORIGIN?.split(",")[0]?.trim();
  return cors?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export function renderEmail(
  subject: string,
  content: EmailContent,
): RenderedEmail {
  const badge = content.badge
    ? BADGE_COLORS[content.badge.tone]
    : null;

  const paragraphsHtml = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#272f47;">${escapeHtml(p)}</p>`,
    )
    .join("");

  const badgeHtml = content.badge
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:${badge!.bg};border:1px solid ${badge!.border};border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${badge!.text};">${escapeHtml(content.badge!.label)}</td></tr></table>`
    : "";

  const highlightHtml = content.highlight
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f4f5f9;border:1px solid #d0d5e3;border-radius:16px;"><tr><td style="padding:24px;text-align:center;"><p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5c6478;">${escapeHtml(content.highlight.label)}</p><p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.2em;color:#0e1320;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(content.highlight.value)}</p></td></tr></table>`
    : "";

  const quoteHtml = content.quote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="border-left:4px solid #8b9cff;padding:12px 16px;background:#f8f9fc;border-radius:0 12px 12px 0;"><p style="margin:0;font-size:14px;line-height:1.6;color:#272f47;font-style:italic;">${escapeHtml(content.quote)}</p></td></tr></table>`
    : "";

  const ctaHtml = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td><a href="${escapeHtml(content.cta.href)}" style="display:inline-block;background:#8b9cff;color:#0a0d14;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:12px;">${escapeHtml(content.cta.label)}</a></td></tr></table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef0f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 20px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:12px;height:12px;background:#8b9cff;border-radius:999px;padding-right:10px;"></td>
                  <td style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#0e1320;">TrustLayer</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #d0d5e3;border-radius:20px;padding:32px 28px;box-shadow:0 8px 30px rgba(14,19,32,0.06);">
              ${badgeHtml}
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:#0e1320;">${escapeHtml(content.title)}</h1>
              ${paragraphsHtml}
              ${highlightHtml}
              ${quoteHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#5c6478;">This is an automated message from TrustLayer. Please do not reply to this email.</p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#8b93a7;">&copy; ${new Date().getFullYear()} TrustLayer. A trust and compatibility layer for online conversation.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    content.title,
    "",
    ...content.paragraphs,
  ];

  if (content.badge) {
    textParts.push("", `[${content.badge.label}]`);
  }
  if (content.highlight) {
    textParts.push("", `${content.highlight.label}: ${content.highlight.value}`);
  }
  if (content.quote) {
    textParts.push("", `Reason: ${content.quote}`);
  }
  if (content.cta) {
    textParts.push("", `${content.cta.label}: ${content.cta.href}`);
  }

  textParts.push(
    "",
    "This is an automated message from TrustLayer. Please do not reply to this email.",
  );

  return {
    subject,
    html,
    text: textParts.join("\n"),
  };
}
