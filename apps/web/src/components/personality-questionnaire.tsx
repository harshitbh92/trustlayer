"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  PERSONALITY_DICHOTOMIES,
  PERSONALITY_QUESTIONS,
} from "@trustlayer/shared";

const SCALE = [1, 2, 3, 4, 5, 6, 7] as const;

const CIRCLE_SIZES = ["h-9 w-9", "h-7 w-7", "h-5 w-5", "h-4 w-4", "h-5 w-5", "h-7 w-7", "h-9 w-9"];

const CIRCLE_COLORS = [
  "border-emerald-500 bg-emerald-500/20 hover:bg-emerald-500/35",
  "border-emerald-400 bg-emerald-400/15 hover:bg-emerald-400/30",
  "border-emerald-300/80 bg-emerald-300/10 hover:bg-emerald-300/25",
  "border-border bg-track hover:bg-surface-elevated",
  "border-violet-300/80 bg-violet-300/10 hover:bg-violet-300/25",
  "border-violet-400 bg-violet-400/15 hover:bg-violet-400/30",
  "border-violet-500 bg-violet-500/20 hover:bg-violet-500/35",
];

interface Props {
  answers: Record<string, number>;
  onChange: (answers: Record<string, number>) => void;
  onSkip?: () => void;
  onSubmit?: () => void;
  busy?: boolean;
}

export function PersonalityQuestionnaire({
  answers,
  onChange,
  onSkip,
  onSubmit,
  busy,
}: Props) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeId, setActiveId] = useState(PERSONALITY_QUESTIONS[0]?.id ?? "");

  const answeredCount = useMemo(
    () => PERSONALITY_QUESTIONS.filter((q) => answers[q.id] != null).length,
    [answers],
  );
  const progress = Math.round(
    (answeredCount / PERSONALITY_QUESTIONS.length) * 100,
  );
  const allAnswered = answeredCount === PERSONALITY_QUESTIONS.length;

  const firstUnanswered = useMemo(
    () => PERSONALITY_QUESTIONS.find((q) => answers[q.id] == null)?.id,
    [answers],
  );

  useEffect(() => {
    if (firstUnanswered) setActiveId(firstUnanswered);
  }, [firstUnanswered]);

  const select = useCallback(
    (questionId: string, value: number) => {
      onChange({ ...answers, [questionId]: value });
      const idx = PERSONALITY_QUESTIONS.findIndex((q) => q.id === questionId);
      const next = PERSONALITY_QUESTIONS[idx + 1];
      if (next) {
        setActiveId(next.id);
        setTimeout(() => {
          refs.current[next.id]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 80);
      }
    },
    [answers, onChange],
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-track">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-0 divide-y divide-border">
        {PERSONALITY_QUESTIONS.map((q, index) => {
          const answered = answers[q.id] != null;
          const isActive = q.id === activeId;
          const isFuture =
            firstUnanswered != null &&
            PERSONALITY_QUESTIONS.findIndex((x) => x.id === q.id) >
              PERSONALITY_QUESTIONS.findIndex((x) => x.id === firstUnanswered);

          return (
            <div
              key={q.id}
              ref={(el) => {
                refs.current[q.id] = el;
              }}
              className={clsx(
                "py-8 transition-opacity duration-300",
                isFuture && !answered && "opacity-35",
                isActive && "opacity-100",
              )}
              onFocus={() => setActiveId(q.id)}
            >
              <p
                className={clsx(
                  "text-center text-lg font-medium leading-snug sm:text-xl",
                  isActive || answered ? "text-foreground" : "text-muted",
                )}
              >
                {q.statement}
              </p>

              <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3">
                <span className="w-14 shrink-0 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Agree
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {SCALE.map((value, i) => {
                    const selected = answers[q.id] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${value} of 7`}
                        onClick={() => select(q.id, value)}
                        className={clsx(
                          "rounded-full border-2 transition-all",
                          CIRCLE_SIZES[i],
                          selected
                            ? "border-accent bg-accent/25 ring-2 ring-accent/40"
                            : CIRCLE_COLORS[i],
                        )}
                      />
                    );
                  })}
                </div>
                <span className="w-14 shrink-0 text-sm font-semibold text-violet-600 dark:text-violet-400">
                  Disagree
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 border-t border-border bg-background/90 py-4 backdrop-blur">
        {onSkip ? (
          <button type="button" onClick={onSkip} className="btn-ghost text-sm">
            Skip for now
          </button>
        ) : (
          <span />
        )}
        <p className="text-xs text-muted">
          {answeredCount} / {PERSONALITY_QUESTIONS.length}
        </p>
        {onSubmit ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!allAnswered || busy}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {busy ? "Submitting…" : "See results"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TraitPercentBars({
  traitPercentages,
}: {
  traitPercentages: Record<string, number>;
}) {
  return (
    <ul className="mt-6 space-y-4">
      {PERSONALITY_DICHOTOMIES.map((d) => {
        const pctA = traitPercentages[d.poleA] ?? 50;
        const pctB = traitPercentages[d.poleB] ?? 50;
        const dominant = pctA >= pctB ? d.poleA : d.poleB;
        const dominantPct = Math.max(pctA, pctB);
        return (
          <li key={d.id}>
            <div className="flex justify-between text-xs text-muted">
              <span className="capitalize">{d.poleA.replace("-", " ")}</span>
              <span className="capitalize">{d.poleB.replace("-", " ")}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-track">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${dominant === d.poleA ? pctA : pctB}%`,
                  marginLeft: dominant === d.poleA ? 0 : `${100 - dominantPct}%`,
                }}
              />
            </div>
            <p className="mt-1 text-center text-xs font-medium capitalize text-foreground">
              {dominant.replace(/-/g, " ")} · {dominantPct}%
            </p>
          </li>
        );
      })}
    </ul>
  );
}
