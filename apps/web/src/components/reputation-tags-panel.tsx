"use client";

import { useMemo } from "react";
import {
  Brain,
  Heart,
  Laugh,
  MessageCircle,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PublicTag } from "@trustlayer/shared";
import { TagList } from "@/components/tag-list";

const CATEGORY_META: Record<
  string,
  { label: string; description: string; icon: LucideIcon; accent: string }
> = {
  trust: {
    label: "Trust & respect",
    description: "Reliability and how safe people feel with them",
    icon: Shield,
    accent: "border-emerald-500/25 bg-emerald-500/[0.07]",
  },
  social: {
    label: "Social energy",
    description: "How they show up with others",
    icon: Users,
    accent: "border-sky-500/25 bg-sky-500/[0.07]",
  },
  intellectual: {
    label: "Intellectual",
    description: "Curiosity, depth, and thinking style",
    icon: Brain,
    accent: "border-indigo-500/25 bg-indigo-500/[0.07]",
  },
  fun: {
    label: "Fun & energy",
    description: "Humor, playfulness, and spark",
    icon: Laugh,
    accent: "border-amber-500/25 bg-amber-500/[0.07]",
  },
  emotional: {
    label: "Emotional",
    description: "Empathy and emotional presence",
    icon: Heart,
    accent: "border-rose-500/25 bg-rose-500/[0.07]",
  },
  style: {
    label: "Communication style",
    description: "How they tend to talk and respond",
    icon: MessageCircle,
    accent: "border-violet-500/25 bg-violet-500/[0.07]",
  },
  compatibility: {
    label: "Compatibility",
    description: "Signals from how people click together",
    icon: Sparkles,
    accent: "border-teal-500/25 bg-teal-500/[0.07]",
  },
  neutral: {
    label: "Other",
    description: "Additional reputation signals",
    icon: Sparkles,
    accent: "border-border bg-surface-elevated/50",
  },
};

const CATEGORY_ORDER = [
  "trust",
  "social",
  "emotional",
  "intellectual",
  "fun",
  "style",
  "compatibility",
  "neutral",
];

interface ReputationTagsPanelProps {
  tags: PublicTag[];
  title?: string;
  subtitle?: string;
  /** Single-column layout for narrow sidebars. */
  compact?: boolean;
}

export function ReputationTagsPanel({
  tags,
  title = "Reputation tags",
  subtitle = "Grouped by how they tend to show up in conversations",
  compact = false,
}: ReputationTagsPanelProps) {
  const safeTags = tags ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, PublicTag[]>();
    for (const tag of safeTags) {
      const key = tag.category || "neutral";
      const list = map.get(key) ?? [];
      list.push(tag);
      map.set(key, list);
    }

    for (const [, list] of map) {
      list.sort((a, b) => b.strength - a.strength || a.label.localeCompare(b.label));
    }

    return [...map.entries()].sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [safeTags]);

  if (!safeTags.length) {
    return (
      <section className={compact ? "surface p-4" : "surface p-5 sm:p-6"}>
        <p className="label">{title}</p>
        {!compact ? (
          <h3 className="mt-1 text-lg font-semibold">Earned from conversations</h3>
        ) : (
          <h3 className="mt-1 text-base font-semibold">Earned tags</h3>
        )}
        <p className="mt-2 text-sm text-muted">
          No tags yet. Chat, connect, and get feedback to grow reputation.
        </p>
      </section>
    );
  }

  return (
    <section
      className={
        compact
          ? "surface overflow-hidden p-4"
          : "surface overflow-hidden p-5 sm:p-6"
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="label">{title}</p>
          {!compact ? (
            <h3 className="mt-1 text-lg font-semibold">Earned from conversations</h3>
          ) : (
            <h3 className="mt-1 text-base font-semibold">Earned tags</h3>
          )}
          {!compact ? (
            <p className="mt-1 text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
        <p className="shrink-0 rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[11px] tabular-nums text-muted">
          {safeTags.length}
        </p>
      </div>

      <div
        className={
          compact
            ? "mt-3 grid grid-cols-1 gap-2.5"
            : "mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        }
      >
        {grouped.map(([category, categoryTags]) => {
          const meta = CATEGORY_META[category] ?? CATEGORY_META.neutral;
          const Icon = meta.icon;
          return (
            <div
              key={category}
              className={`min-w-0 rounded-xl border p-3 ${meta.accent}`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/80">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="truncate text-xs font-semibold">
                      {meta.label}
                    </h4>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted">
                      {categoryTags.length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2.5 min-w-0">
                <TagList tags={categoryTags} showStrength size="sm" />
              </div>
            </div>
          );
        })}
      </div>

      {!compact ? (
        <p className="mt-4 text-xs text-muted/80">
          Only positive or neutral tags appear publicly. Negative signals stay
          internal for moderation.
        </p>
      ) : null}
    </section>
  );
}
