"use client";

import { useMemo, useState } from "react";
import { DiscoverDatingCard } from "@/components/discover/discover-dating-card";
import { DiscoverActionBar } from "@/components/discover/discover-action-bar";
import type { DiscoverUser } from "@trustlayer/shared";

export function DiscoverStackView({
  users,
  onConnect,
  connectingId,
  onRefresh,
}: {
  users: DiscoverUser[];
  onConnect: (user: DiscoverUser) => void;
  connectingId: string | null;
  onRefresh: () => void;
}) {
  const [passedIds, setPassedIds] = useState<string[]>([]);

  const queue = useMemo(
    () => users.filter((user) => !passedIds.includes(user.id)),
    [users, passedIds],
  );

  const current = queue[0];

  function passCurrent() {
    if (!current) return;
    setPassedIds((prev) => [...prev, current.id]);
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-rose-100 bg-white/80 p-8 text-center shadow-lg dark:border-rose-900/40 dark:bg-surface-elevated/80">
        <p className="text-lg font-semibold text-rose-900 dark:text-rose-100">
          You&apos;ve seen everyone for now
        </p>
        <p className="mt-2 text-sm text-muted">
          Check back later or refresh to see profiles again.
        </p>
        <button
          type="button"
          onClick={() => {
            setPassedIds([]);
            onRefresh();
          }}
          className="btn-primary mt-6 bg-rose-500 hover:bg-rose-500/90"
        >
          Refresh discover
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <DiscoverDatingCard user={current} />
      <DiscoverActionBar
        user={current}
        onPass={passCurrent}
        onConnect={() => onConnect(current)}
        connectBusy={connectingId === current.id}
      />
      <p className="text-center text-xs text-muted">
        {queue.length - 1} more profile{queue.length - 1 === 1 ? "" : "s"} in
        this stack
      </p>
    </div>
  );
}
