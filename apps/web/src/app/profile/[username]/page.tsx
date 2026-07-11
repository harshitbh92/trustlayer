"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPin, Pencil, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TrustBadge } from "@/components/trust-badge";
import { UserAvatar } from "@/components/user-avatar";
import { QuestionnaireGateDialog } from "@/components/questionnaire-gate-dialog";
import {
  ProfileViewToggle,
  type ProfileView,
} from "@/components/profile-view-toggle";
import { PersonalityDashboard } from "@/components/personality-dashboard";
import { PersonalityTypeExplainerModal } from "@/components/personality-type-explainer-modal";
import { PersonalityTypeInfoButton } from "@/components/personality-type-info-button";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { ReputationTagsPanel } from "@/components/reputation-tags-panel";
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
  computeAge,
  formatLocation,
  type DiscoverUser,
} from "@trustlayer/shared";

interface PageProps {
  params: Promise<{ username: string }>;
}

function viewFromSearchParams(raw: string | null): ProfileView {
  if (raw === "dashboard") return "dashboard";
  if (raw === "edit") return "edit";
  return "profile";
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
  const [typeExplainerOpen, setTypeExplainerOpen] = useState(false);
  const [view, setView] = useState<ProfileView>(() =>
    viewFromSearchParams(searchParams.get("view")),
  );

  const isMe = me?.id === user?.id;

  useEffect(() => {
    setView(viewFromSearchParams(searchParams.get("view")));
  }, [searchParams]);

  function switchView(next: ProfileView) {
    if (next === "edit" && !isMe) return;
    setView(next);
    const url = new URL(window.location.href);
    if (next === "profile") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", next);
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  }

  useEffect(() => {
    setLoading(true);
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

  const showIncompleteBanner = isMe && !isComplete && view === "profile";
  const location = formatLocation(user.city, user.country);
  const age = isMe
    ? (user.age ?? computeAge(me?.birthDate ?? null))
    : user.age;

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

  const profileHero = (
    <section className="surface-elevated overflow-hidden">
      <div className="bg-gradient-to-br from-accent/15 via-transparent to-accent-deep/10 px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <UserAvatar
              displayName={user.displayName}
              avatarUrl={user.avatarUrl}
              size="lg"
              className="h-20 w-20 text-xl ring-2 ring-background"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {user.displayName}
                {age != null ? (
                  <span className="ml-2 text-xl font-normal text-muted">
                    {age}
                  </span>
                ) : null}
              </h1>
              <p className="text-sm text-muted">@{user.username}</p>
              {location ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </p>
              ) : null}
              {user.personalityType ? (
                <div className="mt-2 flex items-center gap-2">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-accent">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {user.personalityType}
                      {user.personalitySubType
                        ? ` · ${user.personalitySubType}`
                        : ""}
                    </span>
                  </p>
                  <PersonalityTypeInfoButton
                    onClick={() => setTypeExplainerOpen(true)}
                  />
                </div>
              ) : null}
              {user.personalityScore != null ? (
                <p className="mt-1 text-xs text-muted">
                  Personality score {Math.round(user.personalityScore)} / 100
                </p>
              ) : null}
            </div>
          </div>
          <TrustBadge tier={user.trustTier} band={user.trustBand} />
        </div>
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-8">
        {user.bio ? (
          <div>
            <p className="label">About</p>
            <p className="mt-2 text-sm leading-relaxed">{user.bio}</p>
          </div>
        ) : isMe ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
            <p className="text-sm text-muted">
              Add a bio so people know you better.
            </p>
            <button
              type="button"
              onClick={() => switchView("edit")}
              className="btn-ghost mt-3 text-sm"
            >
              Edit profile
            </button>
          </div>
        ) : null}

        {(user.communicationStyle || user.socialEnergy) && (
          <div>
            <p className="label">Communication style</p>
            <p className="mt-1 text-sm">
              {[user.communicationStyle, user.socialEnergy]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}

        {user.interests.length > 0 ? (
          <div>
            <p className="label">Interests</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.interests.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {!isMe && profileActions ? (
          <div className="border-t border-border pt-5">{profileActions}</div>
        ) : null}
      </div>
    </section>
  );

  // Other people's profiles: one integrated page (identity + dashboard + tags).
  if (!isMe) {
    return (
      <div className="space-y-6">
        {profileHero}

        <div>
          <div className="mb-3">
            <p className="label">Personality dashboard</p>
            <h2 className="text-lg font-semibold tracking-tight">
              Insights &amp; interaction style
            </h2>
            <p className="mt-1 text-sm text-muted">
              Type, traits, score, and reputation — all in one place.
            </p>
          </div>
          <PersonalityDashboard
            profile={user}
            isOwner={false}
            embedded
            hideProfileCard
            hideTags
          />
        </div>

        <ReputationTagsPanel tags={user.tags ?? []} />

        <QuestionnaireGateDialog open={dialogOpen} onClose={closeDialog} />
        <PersonalityTypeExplainerModal
          open={typeExplainerOpen}
          onClose={() => setTypeExplainerOpen(false)}
          currentType={user.personalityType}
          currentSubType={user.personalitySubType}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProfileViewToggle
          value={view}
          onChange={switchView}
          showEdit={isMe}
        />
        {view !== "edit" ? (
          <button
            type="button"
            onClick={() => switchView("edit")}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Pencil className="h-4 w-4" />
            Edit profile
          </button>
        ) : null}
      </div>

      {view === "edit" ? (
        <ProfileEditForm />
      ) : view === "dashboard" ? (
        <PersonalityDashboard profile={user} isOwner embedded />
      ) : (
        <>
          {showIncompleteBanner && (
            <section className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
              <h2 className="text-sm font-semibold">
                Personality profile incomplete
              </h2>
              <p className="mt-1 text-sm text-muted">
                Complete the questionnaire to unlock random chat, connections,
                and your personality type.
              </p>
              <Link
                href="/onboarding"
                className="btn-primary mt-4 inline-flex text-sm"
              >
                Complete questionnaire
              </Link>
            </section>
          )}

          {profileHero}

          <ReputationTagsPanel tags={user.tags ?? []} />
        </>
      )}

      <PersonalityTypeExplainerModal
        open={typeExplainerOpen}
        onClose={() => setTypeExplainerOpen(false)}
        currentType={user.personalityType}
        currentSubType={user.personalitySubType}
      />
    </div>
  );
}
