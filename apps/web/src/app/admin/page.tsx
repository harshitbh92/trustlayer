"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  BarChart3,
  Flag,
  HeartHandshake,
  MessageCircle,
  Shield,
  ShieldOff,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@trustlayer/shared";

type Tab = "overview" | "analytics" | "reports" | "users" | "moderation";

interface Stats {
  totalUsers: number;
  openReports: number;
  reportsLast7Days: number;
  totalBlocks: number;
  moderationLast7Days: number;
  activeSessions: number;
}

interface DayCount {
  date: string;
  count: number;
}

interface Analytics {
  growth: {
    signupsByDay: DayCount[];
    signupsLast7Days: number;
    questionnaireComplete: number;
    questionnaireIncomplete: number;
  };
  safety: {
    reportsByStatus: Record<string, number>;
    reportsByDay: DayCount[];
    moderationByType: Record<string, number>;
  };
  engagement: {
    acceptedConnections: number;
    pendingConnections: number;
    messagesLast7Days: number;
    anonymousSessionsLast7Days: number;
    anonymousActive: number;
    feedbackLast7Days: number;
  };
  personality: {
    avgPersonalityScore: number | null;
    profilesCounted: number;
    scoreBands: { label: string; min: number; max: number; count: number }[];
    topPersonalityTypes: { type: string; count: number }[];
  };
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

const TABS = [
  ["overview", "Overview"],
  ["analytics", "Analytics"],
  ["reports", "Reports"],
  ["users", "Users"],
  ["moderation", "Moderation"],
] as const;

function formatDayLabel(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatCard({
  label,
  value,
  icon: Icon,
  onClick,
  href,
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  hint?: string;
}) {
  const className = clsx(
    "surface relative overflow-hidden block w-full p-4 text-left transition",
    "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-accent/60 before:via-accent/20 before:to-transparent",
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
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {(onClick || href) && !hint ? (
        <p className="mt-2 text-xs text-muted">View details →</p>
      ) : null}
      {(onClick || href) && hint ? (
        <p className="mt-2 text-xs text-accent">Open →</p>
      ) : null}
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

function MiniBarChart({
  data,
  emptyLabel = "No data yet",
}: {
  data: DayCount[];
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.every((d) => d.count === 0)) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="flex h-36 items-end gap-1">
      {data.map((d) => (
        <div
          key={d.date}
          className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
        >
          <div
            className="w-full max-w-[14px] rounded-t-md bg-accent/70 transition group-hover:bg-accent"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            title={`${formatDayLabel(d.date)}: ${d.count}`}
          />
          <span className="mt-1 hidden text-[9px] text-muted sm:block">
            {formatDayLabel(d.date).split(" ")[1] ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function DistributionList({
  items,
}: {
  items: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  const total = items.reduce((s, i) => s + i.count, 0);

  if (total === 0) {
    return <p className="text-sm text-muted">No data yet</p>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {item.count}
              {total > 0 ? (
                <span className="text-muted/70">
                  {" "}
                  · {Math.round((item.count / total) * 100)}%
                </span>
              ) : null}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full bg-accent/70"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated/40 px-3 py-3">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-3.5 w-3.5" />
        <p className="label !normal-case !tracking-normal">{label}</p>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface overflow-hidden p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
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

function ScorePill({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="rounded-md bg-track px-2 py-0.5 text-[11px] font-medium text-muted">
        No score
      </span>
    );
  }
  const n = Math.round(score);
  const tone =
    n >= 75
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : n >= 50
        ? "bg-accent/15 text-accent"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-200";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        tone,
      )}
      title="Personality & interaction score"
    >
      <Sparkles className="h-3 w-3" />
      {n}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
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
    const [statsData, analyticsData] = await Promise.all([
      apiFetch<Stats>("/admin/stats"),
      apiFetch<Analytics>("/admin/analytics"),
    ]);
    setStats(statsData);
    setAnalytics(analyticsData);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const data = await apiFetch<Analytics>("/admin/analytics");
    setAnalytics(data);
  }, []);

  const loadReports = useCallback(async () => {
    const qs = reportFilter === "ALL" ? "" : `?status=${reportFilter}`;
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
      if (tab === "analytics") await loadAnalytics();
      if (tab === "reports") await loadReports();
      if (tab === "users") await loadUsers(userQuery);
      if (tab === "moderation") await loadModeration();
    } catch {
      setError("Could not load admin data. Are you signed in as an admin?");
    }
  }, [
    tab,
    loadOverview,
    loadAnalytics,
    loadReports,
    loadUsers,
    loadModeration,
    userQuery,
  ]);

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
      const body = (e as Error & { body?: { message?: string | string[] } })
        .body;
      const msg = body?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? "Moderation action failed"));
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
    if (!window.confirm(`Delete @${u.username}? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: "DELETE" });
      await loadUsers(userQuery);
      if (tab === "overview") await loadOverview();
    } catch (e) {
      const body = (e as Error & { body?: { message?: string | string[] } })
        .body;
      const msg = body?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? "Could not delete user"));
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
    return <p className="text-sm text-muted">Checking admin access…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 -mx-4 sm:mx-auto">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/15 via-surface to-surface-elevated px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label text-rose-400/90">Operations</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Admin control center
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              Safety queue, platform health, and personality trends in one place.
            </p>
            {stats ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                  {stats.openReports} open report
                  {stats.openReports === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-border bg-surface/80 px-2.5 py-1 text-xs text-muted">
                  {stats.activeSessions} live sessions
                </span>
                {analytics ? (
                  <span className="rounded-full border border-border bg-surface/80 px-2.5 py-1 text-xs text-muted">
                    +{analytics.growth.signupsLast7Days} users / 7d
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            onClick={refresh}
            disabled={busy}
            className="btn-ghost relative z-10 text-sm"
          >
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm transition",
              tab === id
                ? "bg-surface-elevated text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats ? (
        <div className="space-y-4">
          {stats.openReports > 0 ? (
            <button
              type="button"
              onClick={() => goToTab("reports", { reportFilter: "OPEN" })}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left transition hover:bg-amber-500/15"
            >
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Needs attention
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
                  {stats.openReports} open report
                  {stats.openReports === 1 ? "" : "s"} waiting in the queue
                </p>
              </div>
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Review →
              </span>
            </button>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total users"
              value={stats.totalUsers}
              icon={Users}
              hint={
                analytics
                  ? `+${analytics.growth.signupsLast7Days} in last 7 days`
                  : undefined
              }
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
              label="Moderation (7 days)"
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

          {analytics ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel
                title="Signups · 14 days"
                subtitle="New accounts per day"
              >
                <MiniBarChart data={analytics.growth.signupsByDay} />
              </Panel>
              <Panel
                title="Quick engagement"
                subtitle="Activity snapshot"
              >
                <div className="grid grid-cols-2 gap-3">
                  <MetricTile
                    label="Messages / 7d"
                    value={analytics.engagement.messagesLast7Days}
                    icon={MessageCircle}
                  />
                  <MetricTile
                    label="Connections"
                    value={analytics.engagement.acceptedConnections}
                    icon={HeartHandshake}
                  />
                  <MetricTile
                    label="Avg score"
                    value={
                      analytics.personality.avgPersonalityScore ?? "—"
                    }
                    icon={Sparkles}
                  />
                  <MetricTile
                    label="Feedback / 7d"
                    value={analytics.engagement.feedbackLast7Days}
                    icon={Activity}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => goToTab("analytics")}
                  className="mt-4 text-xs font-medium text-accent hover:underline"
                >
                  Open full analytics →
                </button>
              </Panel>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "analytics" ? (
        <div className="space-y-4">
          {!analytics ? (
            <p className="text-sm text-muted">Loading analytics…</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricTile
                  label="New users / 7d"
                  value={analytics.growth.signupsLast7Days}
                  icon={UserPlus}
                />
                <MetricTile
                  label="Questionnaire done"
                  value={analytics.growth.questionnaireComplete}
                  icon={BarChart3}
                />
                <MetricTile
                  label="Avg personality score"
                  value={analytics.personality.avgPersonalityScore ?? "—"}
                  icon={Sparkles}
                />
                <MetricTile
                  label="Anon sessions / 7d"
                  value={analytics.engagement.anonymousSessionsLast7Days}
                  icon={MessageCircle}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Signups" subtitle="Last 14 days">
                  <MiniBarChart data={analytics.growth.signupsByDay} />
                </Panel>
                <Panel title="Reports filed" subtitle="Last 14 days">
                  <MiniBarChart data={analytics.safety.reportsByDay} />
                </Panel>
                <Panel title="Report status mix">
                  <DistributionList
                    items={Object.entries(
                      analytics.safety.reportsByStatus,
                    ).map(([label, count]) => ({ label, count }))}
                  />
                </Panel>
                <Panel title="Moderation actions">
                  <DistributionList
                    items={Object.entries(
                      analytics.safety.moderationByType,
                    ).map(([label, count]) => ({ label, count }))}
                  />
                </Panel>
                <Panel
                  title="Personality score bands"
                  subtitle={`${analytics.personality.profilesCounted} profiles`}
                >
                  <DistributionList
                    items={analytics.personality.scoreBands.map((b) => ({
                      label: `${b.label} (${b.min}–${b.max})`,
                      count: b.count,
                    }))}
                  />
                </Panel>
                <Panel title="Top personality types">
                  <DistributionList
                    items={analytics.personality.topPersonalityTypes.map(
                      (t) => ({
                        label: t.type.replace(/^The\s+/i, ""),
                        count: t.count,
                      }),
                    )}
                  />
                </Panel>
              </div>

              <Panel title="Engagement" subtitle="Community activity">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricTile
                    label="Accepted connections"
                    value={analytics.engagement.acceptedConnections}
                    icon={HeartHandshake}
                  />
                  <MetricTile
                    label="Pending connections"
                    value={analytics.engagement.pendingConnections}
                    icon={Users}
                  />
                  <MetricTile
                    label="Messages last 7 days"
                    value={analytics.engagement.messagesLast7Days}
                    icon={MessageCircle}
                  />
                  <MetricTile
                    label="Active anon sessions"
                    value={analytics.engagement.anonymousActive}
                    icon={Activity}
                  />
                  <MetricTile
                    label="Anon sessions last 7d"
                    value={analytics.engagement.anonymousSessionsLast7Days}
                    icon={TrendingUp}
                  />
                  <MetricTile
                    label="Feedback last 7d"
                    value={analytics.engagement.feedbackLast7Days}
                    icon={Flag}
                  />
                  <MetricTile
                    label="Questionnaire incomplete"
                    value={analytics.growth.questionnaireIncomplete}
                    icon={BarChart3}
                  />
                </div>
              </Panel>
            </>
          )}
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
                <li key={r.id} className="surface space-y-3 p-4">
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
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      @{u.username}{" "}
                      <span className="font-normal text-muted">
                        ({u.displayName})
                      </span>
                    </p>
                    <ScorePill score={u.personalityScore} />
                  </div>
                  {u.personalityType ? (
                    <p className="mt-0.5 truncate text-xs text-accent/90">
                      {u.personalityType}
                      {u.personalitySubType
                        ? ` · ${u.personalitySubType}`
                        : ""}
                    </p>
                  ) : null}
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
