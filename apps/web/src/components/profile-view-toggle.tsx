"use client";

import clsx from "clsx";
import { LayoutDashboard, UserRound } from "lucide-react";

export type ProfileView = "profile" | "dashboard";

export function ProfileViewToggle({
  value,
  onChange,
}: {
  value: ProfileView;
  onChange: (view: ProfileView) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-border bg-surface p-1"
      role="tablist"
      aria-label="Profile view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "profile"}
        onClick={() => onChange("profile")}
        className={clsx(
          "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
          value === "profile"
            ? "bg-surface-elevated text-foreground shadow-sm"
            : "text-muted hover:text-foreground",
        )}
      >
        <UserRound className="h-4 w-4" />
        Profile
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "dashboard"}
        onClick={() => onChange("dashboard")}
        className={clsx(
          "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
          value === "dashboard"
            ? "bg-surface-elevated text-foreground shadow-sm"
            : "text-muted hover:text-foreground",
        )}
      >
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </button>
    </div>
  );
}
