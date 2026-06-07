"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  PersonalityQuestionnaire,
  TraitPercentBars,
} from "@/components/personality-questionnaire";
import { TagList } from "@/components/tag-list";
import type { PublicTag, PublicUser } from "@trustlayer/shared";

interface SubmitResponse {
  scores: {
    personalityType: string;
    traitPercentages: Record<string, number>;
    communicationStyle: string;
    socialEnergy: string;
  };
  tagsAwarded?: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refresh, loading } = useAuth();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse["scores"] | null>(null);
  const [previewTags, setPreviewTags] = useState<PublicTag[]>([]);

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
          <p className="mt-2 text-sm text-muted">
            {result.communicationStyle} · {result.socialEnergy}
          </p>

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
            These describe how you tend to communicate — not a score. Your
            profile grows from real conversations over time.
          </p>
          <button
            onClick={() => router.replace("/feed")}
            className="btn-primary mt-6"
          >
            Go to feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Personality questionnaire</h1>
        <p className="mt-2 text-sm text-muted">
          Answer honestly — there are no right or wrong responses. This shapes
          your conversation style and starting tags.
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
