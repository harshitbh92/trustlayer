"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { AvatarScoreRing } from "@/components/avatar-score-ring";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PersonalityAnalytics } from "@/components/personality-analytics";
import { PersonalityScoreExplainerModal } from "@/components/personality-score-explainer-modal";
import { PersonalityTypeExplainerModal } from "@/components/personality-type-explainer-modal";
import { PersonalityTypeInfoButton } from "@/components/personality-type-info-button";
import { ReputationTagsPanel } from "@/components/reputation-tags-panel";
import { TrustBadge } from "@/components/trust-badge";
import { PERSONALITY_SCORE_DIMENSIONS } from "@trustlayer/shared";
import type { PublicUser } from "@trustlayer/shared";

interface ScoreBreakdown {
  qp: number;
  cq: number;
  er: number;
  rc: number;
  cp: number;
  gi: number;
  personalityScore: number;
  band: { label: string; description: string };
}

interface OwnerPersonalityResponse {
  communicationStyle: string | null;
  socialEnergy: string | null;
  empathyScore: number;
  opennessScore: number;
  reliabilityScore: number;
  humorScore: number;
  authenticityScore: number;
  internalScore: number;
  personalityType: string | null;
  personalitySubType: string | null;
  personalityScore: number;
  traitPercentages: Record<string, number> | null;
  questionnaireComplete: boolean;
  presentation?: {
    personalityType: string | null;
    personalitySubType: string | null;
    personalityScore: number;
    scoreBreakdown: ScoreBreakdown;
    strengths: string[];
  } | null;
}

interface PublicPersonalityProfile {
  communicationStyle: string | null;
  socialEnergy: string | null;
  personalityType: string | null;
  personalitySubType: string | null;
  personalityScore: number;
  traitPercentages: Record<string, number> | null;
  questionnaireComplete: boolean;
  publicScore: number;
  scoreBreakdown: ScoreBreakdown | null;
}

interface PersonalityDashboardProps {
  profile: PublicUser;
  isOwner?: boolean;
  embedded?: boolean;
  /** Hide the sticky profile card (useful when a page already has a hero). */
  hideProfileCard?: boolean;
  /** Hide the tags panel when the host page renders tags separately. */
  hideTags?: boolean;
  actions?: ReactNode;
}

export function PersonalityDashboard({
  profile,
  isOwner = false,
  embedded = false,
  hideProfileCard = false,
  hideTags = false,
  actions,
}: PersonalityDashboardProps) {
  const router = useRouter();
  const [ownerPersonality, setOwnerPersonality] =
    useState<OwnerPersonalityResponse | null>(null);
  const [publicPersonality, setPublicPersonality] =
    useState<PublicPersonalityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [typeExplainerOpen, setTypeExplainerOpen] = useState(false);
  const [retakeOpen, setRetakeOpen] = useState(false);
  const [retakeBusy, setRetakeBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = isOwner
      ? "/personality/me"
      : `/personality/user/${encodeURIComponent(profile.username)}`;

    apiFetch<OwnerPersonalityResponse | PublicPersonalityProfile | null>(url)
      .then((data) => {
        if (isOwner) {
          setOwnerPersonality(data as OwnerPersonalityResponse | null);
          setPublicPersonality(null);
        } else {
          setPublicPersonality(data as PublicPersonalityProfile | null);
          setOwnerPersonality(null);
        }
      })
      .finally(() => setLoading(false));
  }, [isOwner, profile.username]);

  async function confirmRetake() {
    setRetakeBusy(true);
    try {
      await apiFetch("/personality/retake", {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });
      router.push("/onboarding");
    } finally {
      setRetakeBusy(false);
      setRetakeOpen(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading dashboard…</p>;
  }

  const personality = isOwner ? ownerPersonality : publicPersonality;
  const breakdown = isOwner
    ? ownerPersonality?.presentation?.scoreBreakdown
    : publicPersonality?.scoreBreakdown;
  const score = isOwner
    ? (ownerPersonality?.presentation?.personalityScore ??
      ownerPersonality?.personalityScore ??
      0)
    : (publicPersonality?.personalityScore ??
      publicPersonality?.publicScore ??
      0);
  const incomplete = !personality?.questionnaireComplete;
  const firstName = profile.displayName.split(" ")[0];
  const strengths = isOwner
    ? (ownerPersonality?.presentation?.strengths ?? [])
    : [];

  return (
    <div className="space-y-6">
      {!embedded && (
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Personality dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {isOwner ? `Hello, ${firstName}!` : `${profile.displayName}'s profile`}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Personality type, interaction score, tags, and trait analytics.
            </p>
          </div>
          <TrustBadge tier={profile.trustTier} band={profile.trustBand} />
        </header>
      )}

      {incomplete && isOwner && (
        <section className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 to-accent/5 p-5">
          <h2 className="text-sm font-semibold">
            Complete your personality profile
          </h2>
          <p className="mt-1 text-sm text-muted">
            Finish the questionnaire to unlock your personality type and score.
          </p>
          <Link href="/onboarding" className="btn-primary mt-4 inline-flex text-sm">
            Complete questionnaire
          </Link>
        </section>
      )}

      {incomplete && !isOwner && (
        <section className="surface-elevated p-5 text-center">
          <p className="text-sm text-muted">
            {profile.displayName} hasn&apos;t completed their personality
            questionnaire yet.
          </p>
        </section>
      )}

      <div
        className={
          hideProfileCard
            ? "space-y-6"
            : "grid gap-6 lg:grid-cols-[1fr_320px]"
        }
      >
        <div className="min-w-0 space-y-6">
          {personality?.questionnaireComplete ? (
            <>
              <PersonalityAnalytics
                dimensions={
                  isOwner && ownerPersonality
                    ? {
                        empathyScore: ownerPersonality.empathyScore,
                        opennessScore: ownerPersonality.opennessScore,
                        reliabilityScore: ownerPersonality.reliabilityScore,
                        humorScore: ownerPersonality.humorScore,
                        authenticityScore: ownerPersonality.authenticityScore,
                      }
                    : undefined
                }
                traitPercentages={personality.traitPercentages}
                communicationStyle={personality.communicationStyle}
                socialEnergy={personality.socialEnergy}
                personalityType={personality.personalityType}
                personalitySubType={
                  isOwner
                    ? ownerPersonality?.personalitySubType
                    : publicPersonality?.personalitySubType
                }
                showDimensions={isOwner}
                typeLabel={isOwner ? "Your type" : "Personality type"}
              />

              {breakdown ? (
                <section className="surface-elevated p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="label">Personality &amp; Interaction Score</p>
                      <p className="mt-2 text-4xl font-semibold tabular-nums">
                        {Math.round(breakdown.personalityScore)}
                        <span className="text-lg text-muted"> / 100</span>
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {breakdown.band.label}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {breakdown.band.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExplainerOpen(true)}
                      className="btn-ghost text-sm"
                    >
                      How we calculate it?
                    </button>
                  </div>

                  {isOwner ? (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {Object.values(PERSONALITY_SCORE_DIMENSIONS).map(
                        (dimension) => (
                          <div
                            key={dimension.key}
                            className="rounded-xl border border-border px-3 py-2"
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span>{dimension.label}</span>
                              <span className="font-semibold tabular-nums">
                                {Math.round(
                                  breakdown[
                                    dimension.key as keyof ScoreBreakdown
                                  ] as number,
                                )}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{
                                  width: `${Math.round(breakdown[dimension.key as keyof ScoreBreakdown] as number)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : null}

                  {isOwner && strengths.length > 0 ? (
                    <div className="mt-6">
                      <p className="label">Strengths</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted">
                        {strengths.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {isOwner ? (
                <section className="surface p-5">
                  <h3 className="text-sm font-semibold">Retake personality test</h3>
                  <p className="mt-2 text-sm text-muted">
                    This removes all your personality tags and resets your
                    personality score. Feedback history stays, but earned tags
                    will be cleared.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRetakeOpen(true)}
                    className="btn-ghost mt-4 text-sm text-rose-600 dark:text-rose-300"
                  >
                    Retake test
                  </button>
                </section>
              ) : null}
            </>
          ) : isOwner ? (
            <section className="surface-elevated p-8 text-center">
              <p className="text-sm text-muted">
                Personality analytics appear after you complete the questionnaire.
              </p>
            </section>
          ) : null}

          {hideProfileCard && !hideTags ? (
            <ReputationTagsPanel tags={profile.tags ?? []} />
          ) : null}
        </div>

        {!hideProfileCard ? (
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="surface-elevated p-6">
              <p className="label text-center">
                {isOwner ? "My profile" : "Profile"}
              </p>
              <AvatarScoreRing
                score={score}
                displayName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                className="mt-4"
              />
              <div className="mt-5 text-center">
                <h2 className="text-lg font-semibold">{profile.displayName}</h2>
                <p className="text-sm text-muted">@{profile.username}</p>
                {profile.personalityType ? (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <p className="text-sm font-medium text-accent">
                      {profile.personalityType}
                      {profile.personalitySubType
                        ? ` · ${profile.personalitySubType}`
                        : ""}
                    </p>
                    <PersonalityTypeInfoButton
                      onClick={() => setTypeExplainerOpen(true)}
                    />
                  </div>
                ) : null}
              </div>
              {profile.bio ? (
                <p className="mt-4 text-center text-sm text-muted">{profile.bio}</p>
              ) : null}
              {isOwner && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link
                    href={`/profile/${profile.username}?view=edit`}
                    className="btn-primary text-sm"
                  >
                    Edit profile
                  </Link>
                  {!embedded ? (
                    <Link
                      href={`/profile/${profile.username}`}
                      className="btn-ghost text-sm"
                    >
                      Public profile
                    </Link>
                  ) : null}
                </div>
              )}
            </section>

            {!hideTags ? (
              <ReputationTagsPanel tags={profile.tags ?? []} compact />
            ) : null}
          </aside>
        ) : null}
      </div>

      {actions}

      <PersonalityScoreExplainerModal
        open={explainerOpen}
        onClose={() => setExplainerOpen(false)}
      />

      <PersonalityTypeExplainerModal
        open={typeExplainerOpen}
        onClose={() => setTypeExplainerOpen(false)}
        currentType={profile.personalityType}
        currentSubType={profile.personalitySubType}
      />

      <ConfirmDialog
        open={retakeOpen}
        title="Retake personality test?"
        description="This will remove all your personality tags and reset your personality score. Feedback history stays, but earned tags will be cleared. This cannot be undone."
        confirmLabel={retakeBusy ? "Resetting…" : "Retake test"}
        onConfirm={() => void confirmRetake()}
        onClose={() => setRetakeOpen(false)}
      />
    </div>
  );
}
