"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  FEEDBACK_QUESTIONS,
  OVERALL_FEELING_OPTIONS,
  type InteractionFeedbackInput,
  type OverallFeeling,
} from "@trustlayer/shared";

interface Props {
  open: boolean;
  onSubmit: (input: InteractionFeedbackInput) => Promise<void>;
  onClose: () => void;
}

const FEELING_LABELS: Record<OverallFeeling, string> = {
  uplifted: "Uplifted",
  comfortable: "Comfortable",
  neutral: "Neutral",
  drained: "A bit drained",
  uneasy: "Uneasy",
};

export function FeedbackModal({ open, onSubmit, onClose }: Props) {
  const [values, setValues] = useState<Partial<InteractionFeedbackInput>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function set<K extends keyof InteractionFeedbackInput>(
    k: K,
    v: InteractionFeedbackInput[K],
  ) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  async function submit() {
    const missing = FEEDBACK_QUESTIONS.find((q) => values[q.key] == null);
    if (missing) {
      setError(`Please answer: "${missing.prompt}"`);
      return;
    }
    if (!values.overallFeeling) {
      setError("Please pick how the conversation felt overall.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values as InteractionFeedbackInput);
    } catch {
      setError("Could not submit feedback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="surface-elevated w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold">How did that feel?</h2>
        <p className="mt-1 text-sm text-muted">
          We don&apos;t ask you to rate the person — only how the conversation
          felt for you. Tags and scores evolve from repeated positive signals,
          not one session.
        </p>

        <div className="mt-5 space-y-4">
          {FEEDBACK_QUESTIONS.map((q) => (
            <div key={q.key}>
              <p className="text-sm">{q.prompt}</p>
              <p className="text-xs text-muted">{q.helper}</p>
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((v) => {
                  const active = values[q.key] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set(q.key, v)}
                      className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition",
                        active
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border hover:border-muted",
                      )}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="text-sm">Overall, how did this conversation feel?</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {OVERALL_FEELING_OPTIONS.map((f) => {
                const active = values.overallFeeling === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set("overallFeeling", f)}
                    className={clsx(
                      "rounded-full border px-3 py-1 text-xs transition",
                      active
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border hover:border-muted",
                    )}
                  >
                    {FEELING_LABELS[f]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Skip
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? "Sending…" : "Send feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
