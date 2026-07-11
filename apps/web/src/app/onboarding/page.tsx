"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  PersonalityQuestionnaire,
  TraitPercentBars,
} from "@/components/personality-questionnaire";
import { PersonalityScoreExplainerModal } from "@/components/personality-score-explainer-modal";
import { TagList } from "@/components/tag-list";
import type { PublicTag, PublicUser } from "@trustlayer/shared";

interface SubmitResponse {
  scores: {
    personalityType: string;
    personalitySubType: string;
    traitPercentages: Record<string, number>;
    communicationStyle: string;
    socialEnergy: string;
    personalityScore: number;
    scoreBand: { label: string; description: string };
    strengths: string[];
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refresh, loading } = useAuth();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse["scores"] | null>(null);
  const [previewTags, setPreviewTags] = useState<PublicTag[]>([]);
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<SubmitResponse>("/personality/submit", {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setResult(res.scores);
      await refresh();
      const me = await apiFetch<PublicUser>("/users/me");
      setPreviewTags(me.tags);
    } catch {
      setError("Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    router.replace("/feed");
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="surface-elevated p-8">
          <p className="label">Your personality type</p>
          <h1 className="mt-2 text-3xl font-semibold">{result.personalityType}</h1>
          <p className="mt-1 text-sm font-medium text-accent">
            {result.personalitySubType}
          </p>
          <p className="mt-2 text-sm text-muted">
            {result.communicationStyle} · {result.socialEnergy}
          </p>

          <div className="mt-6 rounded-xl border border-border p-4">
            <p className="label">Personality &amp; Interaction Score</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {result.personalityScore}
              <span className="text-base text-muted"> / 100</span>
            </p>
            <p className="mt-1 text-sm text-muted">{result.scoreBand.description}</p>
            <button
              type="button"
              onClick={() => setExplainerOpen(true)}
              className="btn-ghost mt-3 px-0 text-sm"
            >
              How we calculate it?
            </button>
          </div>

          <TraitPercentBars traitPercentages={result.traitPercentages} />

          {previewTags.length > 0 && (
            <div className="mt-8">
              <p className="label">Your starting tags</p>
              <div className="mt-3">
                <TagList tags={previewTags} />
              </div>
            </div>
          )}

          <p className="mt-6 text-sm text-muted/90">
            Tags describe how you tend to communicate — they evolve from real
            conversations over time, not from a single rating.
          </p>
          <button
            onClick={() => router.replace("/feed")}
            className="btn-primary mt-6"
          >
            Go to feed
          </button>
        </div>

        <PersonalityScoreExplainerModal
          open={explainerOpen}
          onClose={() => setExplainerOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Personality questionnaire</h1>
        <p className="mt-2 text-sm text-muted">
          Answer honestly — there are no right or wrong responses. This shapes
          your personality type, sub-profile, and starting tags.
        </p>
      </header>

      <PersonalityQuestionnaire
        answers={answers}
        onChange={setAnswers}
        onSkip={skip}
        onSubmit={submit}
        busy={busy}
      />

      {error ? (
        <p className="mt-4 text-center text-sm text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
