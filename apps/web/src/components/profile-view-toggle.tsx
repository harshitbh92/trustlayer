"use client";

import clsx from "clsx";
import { LayoutDashboard, Pencil, UserRound } from "lucide-react";

export type ProfileView = "profile" | "dashboard" | "edit";

export function ProfileViewToggle({
  value,
  onChange,
  showEdit = false,
}: {
  value: ProfileView;
  onChange: (view: ProfileView) => void;
  showEdit?: boolean;
}) {
  const tabs: {
    id: ProfileView;
    label: string;
    icon: typeof UserRound;
  }[] = [
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  if (showEdit) {
    tabs.push({ id: "edit", label: "Edit", icon: Pencil });
  }

  return (
    <div
      className="inline-flex max-w-full flex-wrap rounded-xl border border-border bg-surface p-1"
      role="tablist"
      aria-label="Profile view"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-surface-elevated text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
