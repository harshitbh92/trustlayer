"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  connectionStatusFromPostResponse,
} from "@/lib/connections";
import { DiscoverGridView } from "@/components/discover/discover-grid-view";
import { DiscoverStackView } from "@/components/discover/discover-stack-view";
import { DiscoverSwipeView } from "@/components/discover/discover-swipe-view";
import { QuestionnaireGateDialog } from "@/components/questionnaire-gate-dialog";
import { useAuth } from "@/lib/auth-context";
import { useQuestionnaireGate } from "@/lib/use-questionnaire-gate";
import {
  DiscoverLayout,
  ViewerConnectionStatus,
  type DiscoverUser,
} from "@trustlayer/shared";

export default function DiscoverPage() {
  const { user: me } = useAuth();
  const { dialogOpen, closeDialog, requireComplete } = useQuestionnaireGate();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const layout = me?.discoverLayout ?? DiscoverLayout.DATING_STACK;
  const loveTheme =
    layout === DiscoverLayout.DATING_STACK || layout === DiscoverLayout.SWIPE;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const discoverUsers = await apiFetch<DiscoverUser[]>("/users/discover");
      setUsers(discoverUsers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function connect(u: DiscoverUser) {
    requireComplete(async () => {
      setConnectingId(u.id);
      try {
        const res = await apiFetch<{
          status: string;
          connectionStatus?: ViewerConnectionStatus;
        }>("/connections", {
          method: "POST",
          body: JSON.stringify({ username: u.username }),
        });
        const nextStatus = connectionStatusFromPostResponse(
          res.status,
          res.connectionStatus,
        );
        setUsers((list) =>
          list.map((row) =>
            row.id === u.id ? { ...row, connectionStatus: nextStatus } : row,
          ),
        );
      } catch {
        // Keep server-derived status on failure.
      } finally {
        setConnectingId(null);
      }
    });
  }

  return (
    <div className={loveTheme ? "discover-love-theme -mx-4 -mt-6 px-4 pt-8 sm:-mt-10 sm:pt-12" : "space-y-6"}>
      <div className={loveTheme ? "mx-auto max-w-md space-y-6" : "space-y-6"}>
        <header className={loveTheme ? "text-center" : undefined}>
          {loveTheme ? (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/70 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
              <Heart className="h-3.5 w-3.5 fill-current" />
              Discover connections
            </div>
          ) : null}
          <h1
            className={
              loveTheme
                ? "text-3xl font-semibold tracking-tight text-rose-950 dark:text-rose-50"
                : "text-2xl font-semibold"
            }
          >
            Discover
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loveTheme
              ? "Meet people through personality, interests, and trust — not just photos."
              : "New voices on TrustLayer. Tags describe how people tend to interact — they're not a score."}
          </p>
        </header>

        {loading ? (
          <p className="text-center text-sm text-muted">Loading profiles…</p>
        ) : users.length === 0 ? (
          <p className="text-center text-sm text-muted">No one to show yet.</p>
        ) : layout === DiscoverLayout.GRID ? (
          <DiscoverGridView
            users={users}
            onConnect={connect}
            connectingId={connectingId}
          />
        ) : layout === DiscoverLayout.SWIPE ? (
          <DiscoverSwipeView
            users={users}
            onConnect={connect}
            connectingId={connectingId}
            onRefresh={load}
          />
        ) : (
          <DiscoverStackView
            users={users}
            onConnect={connect}
            connectingId={connectingId}
            onRefresh={load}
          />
        )}
      </div>

      <QuestionnaireGateDialog open={dialogOpen} onClose={closeDialog} />
    </div>
  );
}
