"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { TrustBadge } from "@/components/trust-badge";
import { TagList } from "@/components/tag-list";
import { QuestionnaireGateDialog } from "@/components/questionnaire-gate-dialog";
import {
  ProfileViewToggle,
  type ProfileView,
} from "@/components/profile-view-toggle";
import { PersonalityDashboard } from "@/components/personality-dashboard";
import { useAuth } from "@/lib/auth-context";
import {
  connectionStatusFromPostResponse,
  toConnectUiStatus,
} from "@/lib/connections";
import { ConnectButton } from "@/components/connect-button";
import { MessageButton } from "@/components/message-button";
import { useQuestionnaireGate } from "@/lib/use-questionnaire-gate";
import {
  ViewerConnectionStatus,
  type DiscoverUser,
} from "@trustlayer/shared";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default function ProfilePage({ params }: PageProps) {
  const { username } = use(params);
  const searchParams = useSearchParams();
  const { user: me } = useAuth();
  const { dialogOpen, closeDialog, requireComplete, isComplete } =
    useQuestionnaireGate();
  const [user, setUser] = useState<DiscoverUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [view, setView] = useState<ProfileView>(() =>
    searchParams.get("view") === "dashboard" ? "dashboard" : "profile",
  );

  function switchView(next: ProfileView) {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "dashboard") {
      url.searchParams.set("view", "dashboard");
    } else {
      url.searchParams.delete("view");
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  }

  useEffect(() => {
    apiFetch<DiscoverUser>(`/users/${username}`)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [username]);

  async function block() {
    if (!user) return;
    setPending("block");
    await apiFetch(`/blocks/${user.username}`, { method: "POST" });
    setPending(null);
  }

  function connect() {
    if (!user) return;
    requireComplete(async () => {
      setConnecting(true);
      try {
        const res = await apiFetch<{
          status: string;
          connectionStatus?: ViewerConnectionStatus;
        }>("/connections", {
          method: "POST",
          body: JSON.stringify({ username: user.username }),
        });
        const nextStatus = connectionStatusFromPostResponse(
          res.status,
          res.connectionStatus,
        );
        setUser((current) =>
          current ? { ...current, connectionStatus: nextStatus } : current,
        );
      } catch {
        // Keep server-derived status on failure.
      } finally {
        setConnecting(false);
      }
    });
  }

  async function report() {
    if (!user) return;
    const reason = window.prompt(
      "Why are you reporting this user? (kept internal)",
    );
    if (!reason) return;
    setPending("report");
    await apiFetch("/reports", {
      method: "POST",
      body: JSON.stringify({ targetUserId: user.id, reason }),
    });
    setPending(null);
  }

  if (loading) return <p className="text-sm text-muted">Loading profile…</p>;
  if (!user) return <p className="text-sm text-muted">User not found.</p>;

  const isMe = me?.id === user.id;
  const showIncompleteBanner = isMe && !isComplete && view === "profile";
  const showDashboard = view === "dashboard";

  const profileActions = !isMe ? (
    <section className="flex flex-wrap gap-2">
      <ConnectButton
        status={toConnectUiStatus(user.connectionStatus)}
        onConnect={connect}
        busy={connecting}
        className=""
      />
      {user.connectionStatus === ViewerConnectionStatus.CONNECTED && (
        <MessageButton username={user.username} className="btn-ghost text-sm" />
      )}
      <button onClick={block} disabled={!!pending} className="btn-ghost">
        Block
      </button>
      <button onClick={report} disabled={!!pending} className="btn-ghost">
        Report
      </button>
    </section>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProfileViewToggle value={view} onChange={switchView} />
      </div>

      {showDashboard ? (
        <PersonalityDashboard
          profile={user}
          isOwner={isMe}
          embedded
          actions={profileActions}
        />
      ) : (
        <>
      {showIncompleteBanner && (
        <section className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
          <h2 className="text-sm font-semibold">Personality profile incomplete</h2>
          <p className="mt-1 text-sm text-muted">
            Complete the questionnaire to unlock random chat, connections, and
            your personality type.
          </p>
          <Link href="/onboarding" className="btn-primary mt-4 inline-flex text-sm">
            Complete questionnaire
          </Link>
        </section>
      )}

      <section className="surface-elevated p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{user.displayName}</h1>
            <p className="text-sm text-muted">@{user.username}</p>
            {user.personalityType ? (
              <p className="mt-2 text-sm font-medium text-accent">
                {user.personalityType}
              </p>
            ) : null}
          </div>
          <TrustBadge tier={user.trustTier} band={user.trustBand} />
        </div>
        {user.bio ? <p className="mt-4 text-sm">{user.bio}</p> : null}
        {(user.communicationStyle || user.socialEnergy) && (
          <div className="mt-4">
            <p className="label">Communication profile</p>
            <p className="mt-1 text-sm">
              {[user.communicationStyle, user.socialEnergy]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}
      </section>

      <section className="surface p-5">
        <p className="label">Earned & style tags</p>
        <div className="mt-3">
          <TagList tags={user.tags} empty="No tags yet — keep talking." />
        </div>
        <p className="mt-4 text-xs text-muted/80">
          Only positive or neutral tags ever appear on a profile. Negative
          signals stay internal for moderation.
        </p>
      </section>

      {!isMe && profileActions}

      <QuestionnaireGateDialog open={dialogOpen} onClose={closeDialog} />
        </>
      )}
    </div>
  );
}
