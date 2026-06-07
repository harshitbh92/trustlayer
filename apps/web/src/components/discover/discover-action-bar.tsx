"use client";

import Link from "next/link";
import clsx from "clsx";
import { Check, Star, X } from "lucide-react";
import { toConnectUiStatus } from "@/lib/connections";
import type { DiscoverUser } from "@trustlayer/shared";

export function DiscoverActionBar({
  user,
  onPass,
  onConnect,
  connectBusy,
  className,
}: {
  user: DiscoverUser;
  onPass: () => void;
  onConnect: () => void;
  connectBusy?: boolean;
  className?: string;
}) {
  const status = toConnectUiStatus(user.connectionStatus);
  const connectDisabled =
    connectBusy || status === "connected" || status === "requested";

  return (
    <div
      className={clsx(
        "flex items-center justify-center gap-5 sm:gap-8",
        className,
      )}
    >
      <button
        type="button"
        onClick={onPass}
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-rose-200 bg-white text-rose-500 shadow-md transition hover:scale-105 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-surface-elevated dark:hover:bg-rose-950/40"
        aria-label="Pass"
      >
        <X className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Link
        href={`/profile/${user.username}`}
        className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-amber-500 shadow-md transition hover:scale-105 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-surface-elevated dark:hover:bg-amber-950/40"
        aria-label="View profile"
      >
        <Star className="h-5 w-5 fill-current" />
      </Link>

      <button
        type="button"
        onClick={onConnect}
        disabled={connectDisabled}
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-emerald-600 shadow-lg transition hover:scale-105 hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:bg-surface-elevated dark:hover:bg-emerald-950/40"
        aria-label="Connect"
      >
        <Check className="h-7 w-7" strokeWidth={2.5} />
      </button>
    </div>
  );
}
