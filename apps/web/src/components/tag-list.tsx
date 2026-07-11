import clsx from "clsx";
import type { PublicTag } from "@trustlayer/shared";

const CATEGORY_STYLES: Record<string, string> = {
  trust:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  social:
    "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  intellectual:
    "border-indigo-500/25 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  fun:
    "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  emotional:
    "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  style:
    "border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  compatibility:
    "border-teal-500/25 bg-teal-500/10 text-teal-800 dark:text-teal-200",
  neutral: "border-border bg-surface-elevated text-muted",
};

export function TagList({
  tags,
  empty = "No tags yet",
  showStrength = false,
  size = "md",
}: {
  tags: PublicTag[];
  empty?: string;
  showStrength?: boolean;
  size?: "sm" | "md";
}) {
  if (!tags?.length) {
    return <p className="text-sm text-muted">{empty}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((t) => {
        const strengthPct = Math.round(Math.max(0, Math.min(1, t.strength)) * 100);
        return (
          <li
            key={t.slug}
            className={clsx(
              "inline-flex max-w-full items-center gap-1 rounded-full border font-medium",
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
              CATEGORY_STYLES[t.category] ?? CATEGORY_STYLES.neutral,
            )}
            title={`${t.label} · strength ${strengthPct}%`}
          >
            <span className="truncate">{t.label}</span>
            {showStrength ? (
              <span className="shrink-0 tabular-nums opacity-70">
                {strengthPct}%
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
