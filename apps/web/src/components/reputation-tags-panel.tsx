"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import type { PublicTag } from "@trustlayer/shared";
import { TagList } from "@/components/tag-list";

const CATEGORY_LABELS: Record<string, string> = {
  trust: "Trust & respect",
  social: "Social style",
  intellectual: "Intellectual",
  fun: "Fun & energy",
  emotional: "Emotional",
  style: "Personality style",
};

interface ReputationTagsPanelProps {
  tags: PublicTag[];
}

export function ReputationTagsPanel({ tags }: ReputationTagsPanelProps) {
  const safeTags = tags ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, PublicTag[]>();
    for (const tag of safeTags) {
      const list = map.get(tag.category) ?? [];
      list.push(tag);
      map.set(tag.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [safeTags]);

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(grouped.map(([cat]) => [cat, true])),
  );

  if (!safeTags.length) {
    return (
      <section className="surface p-5">
        <p className="label">Reputation tags</p>
        <h3 className="mt-1 text-lg font-semibold">Earned from conversations</h3>
        <p className="mt-4 text-sm text-muted">
          No tags yet. Chat, connect, and get feedback to grow your reputation.
        </p>
      </section>
    );
  }

  return (
    <section className="surface p-5">
      <p className="label">Reputation tags</p>
      <h3 className="mt-1 text-lg font-semibold">Earned from conversations</h3>
      <p className="mt-1 text-xs text-muted">
        {safeTags.length} tag{safeTags.length === 1 ? "" : "s"} across{" "}
        {grouped.length} categor{grouped.length === 1 ? "y" : "ies"}
      </p>

      <div className="mt-4 space-y-2">
        {grouped.map(([category, categoryTags]) => {
          const isOpen = open[category] ?? true;
          return (
            <div
              key={category}
              className="overflow-hidden rounded-xl border border-border bg-surface-elevated/50"
            >
              <button
                type="button"
                onClick={() =>
                  setOpen((prev) => ({ ...prev, [category]: !isOpen }))
                }
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-surface-elevated"
              >
                <span className="text-sm font-medium">
                  {CATEGORY_LABELS[category] ?? category}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {categoryTags.length}
                  <ChevronDown
                    className={clsx(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </span>
              </button>
              {isOpen ? (
                <div className="border-t border-border px-3 py-3">
                  <TagList tags={categoryTags} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
