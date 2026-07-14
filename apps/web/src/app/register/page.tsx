"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Step = "details" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function requestOtp() {
    if (!ageOk) {
      setError("Please confirm you are at least 13 years old.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/register/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.message === "string"
            ? data.message
            : data.message?.username?.[0] ?? "Could not send verification code";
        setError(msg);
        return;
      }
      setStep("verify");
      setResendCooldown(60);
      if (typeof data.devCode === "string") {
        setDevCode(data.devCode);
        setCode(data.devCode);
      } else {
        setDevCode(null);
      }
    } catch {
      setError("Could not register. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/register/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Invalid or expired code",
        );
        return;
      }
      await setSession(data.token);
      router.replace("/onboarding");
    } catch {
      setError("Could not verify code. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  if (step === "verify") {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="mt-1 text-sm text-muted">
          We sent a 6-digit code to <span className="text-foreground">{email}</span>.
          Check your inbox (and spam folder).
        </p>
        {devCode ? (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-amber-200">Email not delivered</p>
            <p className="mt-1 text-muted">
              We couldn&apos;t send the email, so use this code instead:{" "}
              <span className="font-mono tracking-widest text-ink-100">
                {devCode}
              </span>
            </p>
          </div>
        ) : null}
        <form onSubmit={verifyOtp} className="mt-6 space-y-4">
          <div>
            <label className="label">Verification code</label>
            <input
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="input mt-1 text-center text-lg tracking-[0.3em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="btn-primary w-full"
          >
            {busy ? "Verifying…" : "Verify & create account"}
          </button>
          <button
            type="button"
            onClick={requestOtp}
            disabled={busy || resendCooldown > 0}
            className="btn-ghost w-full text-sm"
          >
            {resendCooldown > 0
              ? `Resend code (${resendCooldown}s)`
              : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setCode("");
              setError(null);
            }}
            className="w-full text-sm text-muted hover:text-foreground"
          >
            Back to details
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">
        Pick a username — we&apos;ll email you a code to verify your address.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          requestOtp();
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input mt-1"
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_]+"
            required
          />
        </div>
        <div>
          <label className="label">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input mt-1"
            maxLength={40}
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
            autoComplete="new-password"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={ageOk}
            onChange={(e) => setAgeOk(e.target.checked)}
            className="mt-1"
          />
          I confirm that I&apos;m at least 13 years old.
        </label>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Sending code…" : "Continue"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
