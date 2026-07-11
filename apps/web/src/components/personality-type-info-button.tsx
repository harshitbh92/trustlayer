"use client";

import { Info } from "lucide-react";
import clsx from "clsx";

export function PersonalityTypeInfoButton({
  onClick,
  className,
  label = "About personality types",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-muted transition hover:border-accent/40 hover:text-accent",
        className,
      )}
      aria-label={label}
      title={label}
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}
