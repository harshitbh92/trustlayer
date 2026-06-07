"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { DiscoverDatingCard } from "@/components/discover/discover-dating-card";
import { DiscoverActionBar } from "@/components/discover/discover-action-bar";
import type { DiscoverUser } from "@trustlayer/shared";

const SWIPE_THRESHOLD = 100;

export function DiscoverSwipeView({
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
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);

  const queue = useMemo(
    () => users.filter((user) => !passedIds.includes(user.id)),
    [users, passedIds],
  );

  const current = queue[0];

  function passCurrent() {
    if (!current) return;
    setPassedIds((prev) => [...prev, current.id]);
    setDragX(0);
  }

  function connectCurrent() {
    if (!current) return;
    onConnect(current);
    setDragX(0);
  }

  function onPointerDown(clientX: number) {
    startXRef.current = clientX;
    setDragging(true);
  }

  function onPointerMove(clientX: number) {
    if (!dragging) return;
    setDragX(clientX - startXRef.current);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      connectCurrent();
    } else if (dragX < -SWIPE_THRESHOLD) {
      passCurrent();
    } else {
      setDragX(0);
    }
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-rose-100 bg-white/80 p-8 text-center shadow-lg dark:border-rose-900/40 dark:bg-surface-elevated/80">
        <p className="text-lg font-semibold text-rose-900 dark:text-rose-100">
          No more profiles to swipe
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

  const rotate = dragX / 20;
  const passOpacity = Math.min(Math.abs(Math.min(dragX, 0)) / SWIPE_THRESHOLD, 1);
  const likeOpacity = Math.min(Math.max(dragX, 0) / SWIPE_THRESHOLD, 1);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="relative touch-pan-y">
        <div
          className={clsx(
            "relative select-none",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{
            transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
            transition: dragging ? "none" : "transform 0.25s ease",
          }}
          onPointerDown={(e) => onPointerDown(e.clientX)}
          onPointerMove={(e) => onPointerMove(e.clientX)}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <DiscoverDatingCard user={current} />
          <div
            className="pointer-events-none absolute left-4 top-8 rounded-xl border-2 border-rose-400 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600"
            style={{ opacity: passOpacity }}
          >
            Pass
          </div>
          <div
            className="pointer-events-none absolute right-4 top-8 rounded-xl border-2 border-emerald-400 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-600"
            style={{ opacity: likeOpacity }}
          >
            Connect
          </div>
        </div>
      </div>

      <DiscoverActionBar
        user={current}
        onPass={passCurrent}
        onConnect={connectCurrent}
        connectBusy={connectingId === current.id}
      />
      <p className="text-center text-xs text-muted">
        Swipe right to connect, left to pass — or use the buttons below
      </p>
    </div>
  );
}
