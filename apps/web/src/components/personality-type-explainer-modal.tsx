"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import {
  MAIN_PERSONALITY_TYPE_INFO,
  MAIN_PERSONALITY_TYPES,
  PERSONALITY_TYPE_ASSIGNMENT_STEPS,
  SUB_PROFILE_TYPE_INFO,
  SUB_PROFILE_TYPES,
  type MainPersonalityType,
  type SubProfileType,
} from "@trustlayer/shared";

export function PersonalityTypeExplainerModal({
  open,
  onClose,
  currentType,
  currentSubType,
}: {
  open: boolean;
  onClose: () => void;
  currentType?: string | null;
  currentSubType?: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const activeMain = (MAIN_PERSONALITY_TYPES as readonly string[]).includes(
    currentType ?? "",
  )
    ? (currentType as MainPersonalityType)
    : null;
  const activeSub = (SUB_PROFILE_TYPES as readonly string[]).includes(
    currentSubType ?? "",
  )
    ? (currentSubType as SubProfileType)
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="personality-type-explainer-title"
        className="surface-elevated flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2
              id="personality-type-explainer-title"
              className="text-lg font-semibold sm:text-xl"
            >
              Personality types &amp; sub-profiles
            </h2>
            <p className="mt-1 text-sm text-muted">
              How TrustLayer assigns your conversational archetype.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost shrink-0 px-2 py-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          {activeMain || activeSub ? (
            <section className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3">
              <p className="label">Your assigned profile</p>
              <p className="mt-1 text-base font-semibold">
                {activeMain ?? "Type pending"}
                {activeSub ? (
                  <span className="text-accent"> · {activeSub}</span>
                ) : null}
              </p>
              {activeMain ? (
                <p className="mt-2 text-sm text-muted">
                  {MAIN_PERSONALITY_TYPE_INFO[activeMain].summary}
                </p>
              ) : null}
              {activeSub ? (
                <p className="mt-1 text-sm text-muted">
                  Sub-profile: {SUB_PROFILE_TYPE_INFO[activeSub].summary}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">How you get your type</h3>
            <ol className="space-y-2">
              {PERSONALITY_TYPE_ASSIGNMENT_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Main personality types</h3>
              <p className="mt-1 text-xs text-muted">
                Broad archetypes from the questionnaire. One is assigned as your
                primary type.
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {MAIN_PERSONALITY_TYPES.map((type) => {
                const info = MAIN_PERSONALITY_TYPE_INFO[type];
                const selected = type === activeMain;
                return (
                  <li
                    key={type}
                    className={clsx(
                      "rounded-xl border px-3 py-3",
                      selected
                        ? "border-accent/40 bg-accent/10"
                        : "border-border bg-surface-elevated/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{type}</p>
                      {selected ? (
                        <span className="shrink-0 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          Yours
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-muted">
                      {info.traits}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">
                      {info.summary}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Sub-profiles</h3>
              <p className="mt-1 text-xs text-muted">
                Your second-strongest style — adds nuance beside the main type
                (for example Thoughtful Analyst · The Challenger).
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {SUB_PROFILE_TYPES.map((type) => {
                const info = SUB_PROFILE_TYPE_INFO[type];
                const selected = type === activeSub;
                return (
                  <li
                    key={type}
                    className={clsx(
                      "rounded-xl border px-3 py-3",
                      selected
                        ? "border-accent/40 bg-accent/10"
                        : "border-border bg-surface-elevated/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{type}</p>
                      {selected ? (
                        <span className="shrink-0 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          Yours
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-muted">
                      {info.traits}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">
                      {info.summary}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <footer className="shrink-0 border-t border-border px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="btn-primary w-full sm:w-auto">
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}
