"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { connectionStatusFromPostResponse } from "@/lib/connections";
import { DiscoverGridView } from "@/components/discover/discover-grid-view";
import { QuestionnaireGateDialog } from "@/components/questionnaire-gate-dialog";
import { useQuestionnaireGate } from "@/lib/use-questionnaire-gate";
import {
  ViewerConnectionStatus,
  type DiscoverUser,
} from "@trustlayer/shared";

export default function DiscoverPage() {
  const { dialogOpen, closeDialog, requireComplete } = useQuestionnaireGate();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "36" });
      if (search) params.set("q", search);
      const discoverUsers = await apiFetch<DiscoverUser[]>(
        `/users/discover?${params.toString()}`,
      );
      setUsers(discoverUsers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(debouncedQuery);
  }, [debouncedQuery, load]);

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
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="mt-1 text-sm text-muted">
            Browse people on TrustLayer. Search by name, username, location,
            interests, or personality.
          </p>
        </div>

        <label className="relative block max-w-xl">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
            className="input w-full pl-10 pr-10"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted transition hover:bg-surface-elevated hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
      </header>

      {loading ? (
        <p className="text-center text-sm text-muted">Loading profiles…</p>
      ) : users.length === 0 ? (
        <p className="text-center text-sm text-muted">
          {debouncedQuery
            ? `No users match “${debouncedQuery}”.`
            : "No one to show yet."}
        </p>
      ) : (
        <>
          {debouncedQuery ? (
            <p className="text-xs text-muted">
              {users.length} result{users.length === 1 ? "" : "s"} for “
              {debouncedQuery}”
            </p>
          ) : null}
          <DiscoverGridView
            users={users}
            onConnect={connect}
            connectingId={connectingId}
          />
        </>
      )}

      <QuestionnaireGateDialog open={dialogOpen} onClose={closeDialog} />
    </div>
  );
}
