/**
 * Verify Gmail SMTP settings in apps/api/.env
 *
 * 1. Enable 2-Step Verification: https://myaccount.google.com/signinoptions/two-step-verification
 * 2. Create an App Password: https://myaccount.google.com/apppasswords
 *    - App: Mail, Device: Other (TrustLayer)
 * 3. Paste the 16-character password into SMTP_PASS in .env (no spaces)
 * 4. Run: npm run test:smtp -w @trustlayer/api
 */
import { config as loadEnv } from "dotenv";
import { join } from "path";
import nodemailer from "nodemailer";

loadEnv({ path: join(__dirname, "..", ".env") });

const host = process.env.SMTP_HOST?.trim();
const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_PASS?.trim();
const port = Number(process.env.SMTP_PORT ?? 587);
const from =
  process.env.SMTP_FROM?.trim() ?? `TrustLayer <${user ?? "noreply@trustlayer.app"}>`;
const to = process.argv[2]?.trim() ?? user;

if (!host || !user || !pass) {
  console.error(
    "Missing SMTP config. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env",
  );
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  requireTLS: port === 587,
  auth: { user, pass },
});

async function main() {
  console.log(`Verifying SMTP as ${user}…`);
  await transport.verify();
  console.log("SMTP connection OK.");

  if (!to) {
    console.log("No recipient — skipping send test.");
    return;
  }

  const info = await transport.sendMail({
    from,
    to,
    subject: "TrustLayer SMTP test",
    text: "If you received this, Gmail SMTP is configured correctly.",
  });
  console.log(`Test email sent to ${to} (messageId: ${info.messageId})`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("SMTP test failed:", message);
  console.error(
    "\nCommon fixes:\n" +
      "  • Use a Google App Password, not your normal Gmail password\n" +
      "  • Enable 2-Step Verification first\n" +
      "  • Remove spaces from the 16-character app password\n" +
      "  • SMTP_USER must match the Google account that owns the app password",
  );
  process.exit(1);
});
