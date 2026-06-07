"use client";

import clsx from "clsx";
import { User } from "lucide-react";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface AvatarScoreRingProps {
  score: number;
  displayName: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

export function AvatarScoreRing({
  score,
  displayName,
  avatarUrl,
  size = 132,
  className,
}: AvatarScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (clamped / 100) * circumference;
  const avatarSize = size - stroke * 2 - 16;

  return (
    <div className={clsx("flex flex-col items-center", className)}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          className="absolute inset-0 -rotate-90"
          width={size}
          height={size}
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--track)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#8b9cff"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>

        <div
          className="relative overflow-hidden rounded-full bg-gradient-to-br from-accent/30 to-accent-deep/40 ring-2 ring-surface-elevated"
          style={{ width: avatarSize, height: avatarSize }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-accent/15 text-accent">
              {initials(displayName) ? (
                <span className="text-2xl font-semibold">{initials(displayName)}</span>
              ) : (
                <User className="h-10 w-10" strokeWidth={1.5} />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-3xl font-semibold tabular-nums tracking-tight">
          {clamped}
          <span className="text-lg font-medium text-muted">%</span>
        </p>
        <p className="mt-0.5 text-xs uppercase tracking-wider text-muted">
          Personality score
        </p>
      </div>
    </div>
  );
}
