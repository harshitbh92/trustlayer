"use client";

import { PERSONALITY_SCORE_BANDS, PERSONALITY_SCORE_DIMENSIONS } from "@trustlayer/shared";

interface PersonalityScoreExplainerModalProps {
  open: boolean;
  onClose: () => void;
}

export function PersonalityScoreExplainerModal({
  open,
  onClose,
}: PersonalityScoreExplainerModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="surface-elevated max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <h2 className="text-xl font-semibold">
          How we calculate Personality &amp; Interaction Score
        </h2>
        <p className="mt-2 text-sm text-muted">
          This is not a popularity contest or a moral rating. It reflects how
          you communicate, how others feel in conversations with you, and how
          your profile evolves through real interactions.
        </p>

        <section className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold">Hybrid profile system</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>
              <strong className="text-foreground">Personality type</strong> — a
              broad archetype from onboarding.
            </li>
            <li>
              <strong className="text-foreground">Sub-profile</strong> — your
              second-strongest conversational style.
            </li>
            <li>
              <strong className="text-foreground">Dynamic tags</strong> — earned
              over time from repeated positive signals.
            </li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold">Score dimensions</h3>
          <div className="space-y-2">
            {Object.values(PERSONALITY_SCORE_DIMENSIONS).map((dimension) => (
              <div
                key={dimension.key}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span>{dimension.label}</span>
                <span className="font-medium tabular-nums">
                  {Math.round(dimension.weight * 100)}%
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold">Recent behavior matters more</h3>
          <p className="text-sm text-muted">
            Feedback from the last 30 days counts most (50%), then 31–90 days
            (30%), then 91–365 days (20%).
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold">Score bands</h3>
          <ul className="space-y-2">
            {PERSONALITY_SCORE_BANDS.map((band) => (
              <li
                key={band.label}
                className="rounded-xl border border-border px-3 py-2 text-sm"
              >
                <p className="font-medium">
                  {band.min}–{band.max}: {band.label}
                </p>
                <p className="mt-1 text-muted">{band.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold">Separate from moderation</h3>
          <p className="mt-2 text-sm text-muted">
            Reports, toxicity flags, and abuse signals feed internal safety
            systems. They are not used to assign public personality tags or to
            shame users on their profile.
          </p>
        </section>

        <button type="button" onClick={onClose} className="btn-primary mt-6">
          Got it
        </button>
      </div>
    </div>
  );
}
