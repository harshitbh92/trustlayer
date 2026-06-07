import clsx from "clsx";
import type { PublicTag } from "@trustlayer/shared";

const CATEGORY_STYLES: Record<string, string> = {
  trust: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border-emerald-500/20",
  social: "bg-sky-500/10 text-sky-700 dark:text-sky-200 border-sky-500/20",
  intellectual: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 border-indigo-500/20",
  fun: "bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-500/20",
  emotional: "bg-rose-500/10 text-rose-700 dark:text-rose-200 border-rose-500/20",
  style: "bg-surface-elevated text-muted border-border",
};

export function TagList({
  tags,
  empty = "No tags yet",
}: {
  tags: PublicTag[];
  empty?: string;
}) {
  if (!tags?.length) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <li
          key={t.slug}
          className={clsx(
            "rounded-full border px-2.5 py-0.5 text-xs",
            CATEGORY_STYLES[t.category] ?? CATEGORY_STYLES.style,
          )}
          title={`${t.label} · strength ${(t.strength * 100).toFixed(0)}%`}
        >
          {t.label}
        </li>
      ))}
    </ul>
  );
}
