"use client";

import { useState } from "react";
import clsx from "clsx";
import { Brain, Heart, Shield, Sparkles, Sun } from "lucide-react";
import { PERSONALITY_DICHOTOMIES } from "@trustlayer/shared";
import type { LucideIcon } from "lucide-react";
import { PersonalityTypeExplainerModal } from "@/components/personality-type-explainer-modal";
import { PersonalityTypeInfoButton } from "@/components/personality-type-info-button";

interface DimensionScores {
  empathyScore: number;
  opennessScore: number;
  reliabilityScore: number;
  humorScore: number;
  authenticityScore: number;
}

interface PersonalityAnalyticsProps {
  dimensions?: DimensionScores;
  traitPercentages: Record<string, number> | null;
  communicationStyle?: string | null;
  socialEnergy?: string | null;
  personalityType?: string | null;
  personalitySubType?: string | null;
  showDimensions?: boolean;
  typeLabel?: string;
}

const DIMENSIONS: {
  key: keyof DimensionScores;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  {
    key: "empathyScore",
    label: "Empathy",
    icon: Heart,
    color: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-300",
  },
  {
    key: "opennessScore",
    label: "Openness",
    icon: Brain,
    color: "from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-300",
  },
  {
    key: "reliabilityScore",
    label: "Reliability",
    icon: Shield,
    color: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-300",
  },
  {
    key: "humorScore",
    label: "Humor",
    icon: Sparkles,
    color: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-300",
  },
  {
    key: "authenticityScore",
    label: "Authenticity",
    icon: Sun,
    color: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-300",
  },
];

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(100, value)));

  return (
    <div className="surface-elevated p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{pct}%</p>
        </div>
        <div
          className={clsx(
            "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br",
            color,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PersonalityAnalytics({
  dimensions,
  traitPercentages,
  communicationStyle,
  socialEnergy,
  personalityType,
  personalitySubType,
  showDimensions = true,
  typeLabel = "Your type",
}: PersonalityAnalyticsProps) {
  const traits = traitPercentages ?? {};
  const [typeExplainerOpen, setTypeExplainerOpen] = useState(false);

  return (
    <div className="space-y-6">
      {(personalityType || communicationStyle || socialEnergy) && (
        <section className="surface-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <p className="label">{typeLabel}</p>
            <PersonalityTypeInfoButton
              onClick={() => setTypeExplainerOpen(true)}
            />
          </div>
          {personalityType ? (
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {personalityType}
            </h2>
          ) : null}
          {personalitySubType ? (
            <p className="mt-1 text-sm font-medium text-accent">
              {personalitySubType}
            </p>
          ) : null}
          {(communicationStyle || socialEnergy) && (
            <p className="mt-2 text-sm text-muted">
              {[communicationStyle, socialEnergy].filter(Boolean).join(" · ")}
            </p>
          )}
        </section>
      )}

      {showDimensions && dimensions ? (
        <section>
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <p className="label">Dimension scores</p>
              <h3 className="mt-1 text-lg font-semibold">Personality analytics</h3>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {DIMENSIONS.map((d) => (
              <MetricCard
                key={d.key}
                label={d.label}
                value={dimensions[d.key]}
                icon={d.icon}
                color={d.color}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="surface p-5 sm:p-6">
        <p className="label">Trait balance</p>
        <h3 className="mt-1 text-lg font-semibold">
          {showDimensions ? "How you show up" : "How they show up"}
        </h3>
        <ul className="mt-6 space-y-5">
          {PERSONALITY_DICHOTOMIES.map((d) => {
            const rawA = Math.max(0, traits[d.poleA] ?? 50);
            const rawB = Math.max(0, traits[d.poleB] ?? 50);
            const total = rawA + rawB || 1;
            const pctA = (rawA / total) * 100;
            const pctB = (rawB / total) * 100;
            const dominant = rawA >= rawB ? d.poleA : d.poleB;
            const dominantPct = Math.round(Math.max(rawA, rawB));

            return (
              <li key={d.id} className="min-w-0">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 font-medium text-muted">{d.label}</span>
                  <span className="truncate text-right font-semibold capitalize text-foreground">
                    {dominant.replace(/-/g, " ")} · {dominantPct}%
                  </span>
                </div>
                <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-track">
                  <div
                    className="h-full bg-accent/80 transition-all duration-500"
                    style={{ width: `${pctA}%` }}
                  />
                  <div
                    className="h-full bg-accent-deep/50 transition-all duration-500"
                    style={{ width: `${pctB}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between gap-2 text-[10px] uppercase tracking-wide text-muted">
                  <span className="truncate capitalize">
                    {d.poleA.replace(/-/g, " ")}
                  </span>
                  <span className="truncate capitalize text-right">
                    {d.poleB.replace(/-/g, " ")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <PersonalityTypeExplainerModal
        open={typeExplainerOpen}
        onClose={() => setTypeExplainerOpen(false)}
        currentType={personalityType}
        currentSubType={personalitySubType}
      />
    </div>
  );
}
