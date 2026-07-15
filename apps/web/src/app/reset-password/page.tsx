"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/password-input";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("email");
    if (q) setEmail(q);
    const stored = sessionStorage.getItem("devResetCode");
    if (stored) {
      setDevCode(stored);
      setCode(stored);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Could not reset password",
        );
        return;
      }
      sessionStorage.removeItem("devResetCode");
      router.replace("/login?reset=1");
    } catch {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the 6-digit code from your email and choose a new password.
      </p>
      {devCode ? (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-amber-200">Email not delivered</p>
          <p className="mt-1 text-muted">
            We couldn&apos;t send the email, so use this reset code:{" "}
            <span className="font-mono tracking-widest text-ink-100">
              {devCode}
            </span>
          </p>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
          <label className="label">Reset code</label>
          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="input mt-1 text-center tracking-[0.3em]"
            inputMode="numeric"
            maxLength={6}
            required
          />
        </div>
        <div>
          <label className="label">New password</label>
          <PasswordInput
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            wrapperClassName="mt-1"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <PasswordInput
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            wrapperClassName="mt-1"
            autoComplete="new-password"
          />
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        <Link href="/forgot-password" className="text-accent hover:underline">
          Request a new code
        </Link>
        {" · "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
