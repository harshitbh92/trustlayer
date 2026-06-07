"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { AvatarScoreRing } from "@/components/avatar-score-ring";
import { PersonalityAnalytics } from "@/components/personality-analytics";
import { ReputationTagsPanel } from "@/components/reputation-tags-panel";
import { TrustBadge } from "@/components/trust-badge";
import type { PublicUser } from "@trustlayer/shared";

interface OwnerPersonalityProfile {
  communicationStyle: string | null;
  socialEnergy: string | null;
  empathyScore: number;
  opennessScore: number;
  reliabilityScore: number;
  humorScore: number;
  authenticityScore: number;
  internalScore: number;
  personalityType: string | null;
  traitPercentages: Record<string, number> | null;
  questionnaireComplete: boolean;
}

interface PublicPersonalityProfile {
  communicationStyle: string | null;
  socialEnergy: string | null;
  personalityType: string | null;
  traitPercentages: Record<string, number> | null;
  questionnaireComplete: boolean;
  publicScore: number;
}

interface PersonalityDashboardProps {
  profile: PublicUser;
  isOwner?: boolean;
  /** When true, omits page header and public profile link (e.g. embedded in profile page). */
  embedded?: boolean;
  actions?: ReactNode;
}

export function PersonalityDashboard({
  profile,
  isOwner = false,
  embedded = false,
  actions,
}: PersonalityDashboardProps) {
  const [ownerPersonality, setOwnerPersonality] =
    useState<OwnerPersonalityProfile | null>(null);
  const [publicPersonality, setPublicPersonality] =
    useState<PublicPersonalityProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = isOwner
      ? "/personality/me"
      : `/personality/user/${encodeURIComponent(profile.username)}`;

    apiFetch<OwnerPersonalityProfile | PublicPersonalityProfile | null>(url)
      .then((data) => {
        if (isOwner) {
          setOwnerPersonality(data as OwnerPersonalityProfile | null);
          setPublicPersonality(null);
        } else {
          setPublicPersonality(data as PublicPersonalityProfile | null);
          setOwnerPersonality(null);
        }
      })
      .finally(() => setLoading(false));
  }, [isOwner, profile.username]);

  if (loading) {
    return <p className="text-sm text-muted">Loading dashboard…</p>;
  }

  const personality = isOwner ? ownerPersonality : publicPersonality;
  const score = isOwner
    ? (ownerPersonality?.internalScore ?? 0)
    : (publicPersonality?.publicScore ?? 0);
  const incomplete = !personality?.questionnaireComplete;
  const firstName = profile.displayName.split(" ")[0];

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
              {isOwner
                ? "Your conversation style, reputation tags, and trait analytics in one place."
                : "Conversation style, reputation tags, and trait balance."}
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
            Finish the questionnaire to unlock your full score ring and trait
            analytics.
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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {personality?.questionnaireComplete ? (
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
              showDimensions={isOwner}
              typeLabel={isOwner ? "Your type" : "Personality type"}
            />
          ) : isOwner ? (
            <section className="surface-elevated p-8 text-center">
              <p className="text-sm text-muted">
                Personality analytics appear after you complete the
                questionnaire.
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
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
                <p className="mt-2 text-sm font-medium text-accent">
                  {profile.personalityType}
                </p>
              ) : null}
            </div>
            {profile.bio ? (
              <p className="mt-4 text-center text-sm text-muted">
                {profile.bio}
              </p>
            ) : null}
            {isOwner && !embedded && (
              <div className="mt-5 flex justify-center gap-2">
                <Link
                  href={`/profile/${profile.username}`}
                  className="btn-ghost text-sm"
                >
                  Public profile
                </Link>
                <Link href="/settings" className="btn-ghost text-sm">
                  Edit profile
                </Link>
              </div>
            )}
            {isOwner && embedded && (
              <div className="mt-5 flex justify-center">
                <Link href="/settings" className="btn-ghost text-sm">
                  Edit profile
                </Link>
              </div>
            )}
          </section>

          <ReputationTagsPanel tags={profile.tags ?? []} />
        </aside>
      </div>

      {actions}
    </div>
  );
}
