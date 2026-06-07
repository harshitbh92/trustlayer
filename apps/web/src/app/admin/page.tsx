"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Flag,
  MessageCircle,
  Shield,
  ShieldOff,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@trustlayer/shared";

type Tab = "overview" | "reports" | "users" | "moderation";

interface Stats {
  totalUsers: number;
  openReports: number;
  reportsLast7Days: number;
  totalBlocks: number;
  moderationLast7Days: number;
  activeSessions: number;
}

interface AdminReport {
  id: string;
  reason: string;
  context: string | null;
  sessionId: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reporter: PublicUser;
  target: PublicUser;
}

interface AdminUser extends PublicUser {
  email: string;
  reportCount: number;
}

interface ModerationEntry {
  id: string;
  type: string;
  reason: string;
  reportId: string | null;
  expiresAt: string | null;
  createdAt: string;
  target: { id: string; username: string; displayName: string };
  actor: { id: string; username: string; displayName: string };
}

const REPORT_FILTERS = ["OPEN", "REVIEWED", "ACTIONED", "DISMISSED", "ALL"] as const;
const MOD_TYPES = ["WARN", "SHADOWBAN", "SUSPEND", "BAN"] as const;
const ROLES = ["GUEST", "STANDARD", "VERIFIED", "ADMIN"] as const;

function StatCard({
  label,
  value,
  icon: Icon,
  onClick,
  href,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
}) {
  const className = clsx(
    "surface block w-full p-4 text-left transition",
    (onClick || href) &&
      "cursor-pointer hover:border-accent/40 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="label">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {(onClick || href) && (
        <p className="mt-2 text-xs text-muted">View details →</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "OPEN"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-200"
      : status === "ACTIONED"
        ? "bg-rose-500/15 text-rose-700 dark:text-rose-200"
        : status === "DISMISSED"
          ? "bg-track text-muted"
          : "bg-accent/15 text-accent";
  return (
    <span className={clsx("rounded-md px-2 py-0.5 text-xs font-medium", tone)}>
      {status}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportFilter, setReportFilter] =
    useState<(typeof REPORT_FILTERS)[number]>("OPEN");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [moderation, setModeration] = useState<ModerationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [actionReport, setActionReport] = useState<AdminReport | null>(null);
  const [modType, setModType] = useState<(typeof MOD_TYPES)[number]>("WARN");
  const [modReason, setModReason] = useState("");
  const [modExpires, setModExpires] = useState("");

  const loadOverview = useCallback(async () => {
    const data = await apiFetch<Stats>("/admin/stats");
    setStats(data);
  }, []);

  const loadReports = useCallback(async () => {
    const qs =
      reportFilter === "ALL" ? "" : `?status=${reportFilter}`;
    const data = await apiFetch<AdminReport[]>(`/admin/reports${qs}`);
    setReports(data);
  }, [reportFilter]);

  const loadUsers = useCallback(async (q?: string) => {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const data = await apiFetch<AdminUser[]>(`/admin/users${qs}`);
    setUsers(data);
  }, []);

  const loadModeration = useCallback(async () => {
    const data = await apiFetch<ModerationEntry[]>("/admin/moderation");
    setModeration(data);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      if (tab === "overview") await loadOverview();
      if (tab === "reports") await loadReports();
      if (tab === "users") await loadUsers(userQuery);
      if (tab === "moderation") await loadModeration();
    } catch {
      setError("Could not load admin data. Are you signed in as an admin?");
    }
  }, [tab, loadOverview, loadReports, loadUsers, loadModeration, userQuery]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "ADMIN") {
      router.replace("/feed");
      return;
    }
    refresh();
  }, [user, loading, router, refresh]);

  async function markReport(id: string, status: "REVIEWED" | "DISMISSED") {
    setBusy(true);
    try {
      await apiFetch(`/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadReports();
      if (tab === "overview") await loadOverview();
    } finally {
      setBusy(false);
    }
  }

  async function submitModeration() {
    if (!actionReport || modReason.trim().length < 3) return;
    setBusy(true);
    try {
      const body: Record<string, string> = {
        targetUserId: actionReport.target.id,
        type: modType,
        reason: modReason.trim(),
        reportId: actionReport.id,
      };
      if (modType === "SUSPEND" && modExpires) {
        body.expiresAt = new Date(modExpires).toISOString();
      }
      await apiFetch("/admin/moderation", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setActionReport(null);
      setModReason("");
      setModExpires("");
      await loadReports();
      await loadModeration();
      if (tab === "overview") await loadOverview();
    } catch (e) {
      const body = (e as Error & { body?: { message?: string | string[] } }).body;
      const msg = body?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? "Moderation action failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, role: (typeof ROLES)[number]) {
    setBusy(true);
    try {
      await apiFetch(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await loadUsers(userQuery);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(u: AdminUser) {
    if (
      !window.confirm(
        `Delete @${u.username}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: "DELETE" });
      await loadUsers(userQuery);
      if (tab === "overview") await loadOverview();
    } catch (e) {
      const body = (e as Error & { body?: { message?: string | string[] } }).body;
      const msg = body?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? "Could not delete user");
    } finally {
      setBusy(false);
    }
  }

  function goToTab(
    next: Tab,
    options?: { reportFilter?: (typeof REPORT_FILTERS)[number] },
  ) {
    if (options?.reportFilter) setReportFilter(options.reportFilter);
    setTab(next);
  }

  if (loading || !user || user.role !== "ADMIN") {
    return (
      <p className="text-sm text-muted">Checking admin access…</p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 -mx-4 sm:mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-rose-300/80">Security</p>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Review reports, moderate users, and monitor platform safety.
          </p>
        </div>
        <button onClick={refresh} disabled={busy} className="btn-ghost text-sm">
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(
          [
            ["overview", "Overview"],
            ["reports", "Reports"],
            ["users", "Users"],
            ["moderation", "Moderation log"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm transition",
              tab === id
                ? "bg-surface-elevated text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total users"
            value={stats.totalUsers}
            icon={Users}
            onClick={() => goToTab("users")}
          />
          <StatCard
            label="Open reports"
            value={stats.openReports}
            icon={Flag}
            onClick={() => goToTab("reports", { reportFilter: "OPEN" })}
          />
          <StatCard
            label="Reports (7 days)"
            value={stats.reportsLast7Days}
            icon={TrendingUp}
            onClick={() => goToTab("reports", { reportFilter: "ALL" })}
          />
          <StatCard
            label="User blocks"
            value={stats.totalBlocks}
            icon={ShieldOff}
            onClick={() => goToTab("users")}
          />
          <StatCard
            label="Moderation actions (7 days)"
            value={stats.moderationLast7Days}
            icon={Shield}
            onClick={() => goToTab("moderation")}
          />
          <StatCard
            label="Active chat sessions"
            value={stats.activeSessions}
            icon={MessageCircle}
            href="/random"
          />
        </div>
      ) : null}

      {tab === "reports" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {REPORT_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setReportFilter(f)}
                className={clsx(
                  "rounded-lg px-3 py-1 text-xs font-medium",
                  reportFilter === f
                    ? "bg-accent/20 text-accent"
                    : "bg-surface-elevated text-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {reports.length === 0 ? (
            <p className="text-sm text-muted">No reports in this queue.</p>
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="surface p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-muted">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium">{r.reason}</p>
                  {r.context ? (
                    <p className="text-sm text-muted">{r.context}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>
                      Reporter:{" "}
                      <Link
                        href={`/profile/${r.reporter.username}`}
                        className="text-accent hover:underline"
                      >
                        @{r.reporter.username}
                      </Link>
                    </span>
                    <span>
                      Target:{" "}
                      <Link
                        href={`/profile/${r.target.username}`}
                        className="text-accent hover:underline"
                      >
                        @{r.target.username}
                      </Link>
                    </span>
                  </div>
                  {r.status === "OPEN" || r.status === "REVIEWED" ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {r.status === "OPEN" ? (
                        <button
                          disabled={busy}
                          onClick={() => markReport(r.id, "REVIEWED")}
                          className="btn-ghost text-xs"
                        >
                          Mark reviewed
                        </button>
                      ) : null}
                      <button
                        disabled={busy}
                        onClick={() => {
                          setActionReport(r);
                          setModReason(r.reason);
                        }}
                        className="btn-primary text-xs"
                      >
                        Take action
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => markReport(r.id, "DISMISSED")}
                        className="text-xs text-muted hover:text-foreground"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "users" ? (
        <section className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadUsers(userQuery);
            }}
            className="flex gap-2"
          >
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search username, email, or name…"
              className="input max-w-md"
            />
            <button type="submit" className="btn-ghost">
              Search
            </button>
          </form>

          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={u.id}
                className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    @{u.username}{" "}
                    <span className="text-muted font-normal">
                      ({u.displayName})
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {u.email} · {u.reportCount} report
                    {u.reportCount === 1 ? "" : "s"} against
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      changeRole(u.id, e.target.value as (typeof ROLES)[number])
                    }
                    disabled={busy || u.id === user.id}
                    className="input w-auto text-xs"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <Link
                    href={`/profile/${u.username}`}
                    className="text-xs text-accent hover:underline"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteUser(u)}
                    disabled={busy || u.id === user.id || u.role === "ADMIN"}
                    className="btn-ghost text-xs text-rose-400 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "moderation" ? (
        <section className="space-y-3">
          {moderation.length === 0 ? (
            <p className="text-sm text-muted">No moderation actions yet.</p>
          ) : (
            moderation.map((m) => (
              <div key={m.id} className="surface px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-rose-200">{m.type}</span>
                  <span className="text-xs text-muted">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1">{m.reason}</p>
                <p className="mt-2 text-xs text-muted">
                  Target @{m.target.username} · by @{m.actor.username}
                  {m.expiresAt
                    ? ` · until ${new Date(m.expiresAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
            ))
          )}
        </section>
      ) : null}

      {actionReport ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="surface-elevated w-full max-w-md space-y-4 p-6">
            <h2 className="text-lg font-semibold">Moderate user</h2>
            <p className="text-sm text-muted">
              Action against @{actionReport.target.username} for report:{" "}
              {actionReport.reason}
            </p>
            <div>
              <label className="label">Action type</label>
              <select
                value={modType}
                onChange={(e) =>
                  setModType(e.target.value as (typeof MOD_TYPES)[number])
                }
                className="input mt-1"
              >
                {MOD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Reason</label>
              <textarea
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                className="input mt-1"
                rows={3}
              />
            </div>
            {modType === "SUSPEND" ? (
              <div>
                <label className="label">Expires at</label>
                <input
                  type="datetime-local"
                  value={modExpires}
                  onChange={(e) => setModExpires(e.target.value)}
                  className="input mt-1"
                  required
                />
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActionReport(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={submitModeration}
                disabled={busy || modReason.trim().length < 3}
                className="btn-primary"
              >
                Apply action
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
