"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ConnectedPersonRow,
  IncomingRequestRow,
  OutgoingRequestRow,
  matchesConnectionQuery,
} from "@/components/connection-row";
import { useAuth } from "@/lib/auth-context";
import type { PublicUser } from "@trustlayer/shared";

interface Incoming {
  id: string;
  status: string;
  createdAt: string;
  requester: PublicUser;
}

interface Mine {
  id: string;
  status: string;
  createdAt: string;
  requester: PublicUser;
  receiver: PublicUser;
}

interface ConnectionsResponse {
  incoming: Incoming[];
  mine: Mine[];
}

type FilterTab = "all" | "connected" | "requests" | "sent";

function otherUser(meId: string | undefined, c: Mine): PublicUser {
  return meId === c.requester.id ? c.receiver : c.requester;
}

export default function ConnectionsPage() {
  const { user: me } = useAuth();
  const [data, setData] = useState<ConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<ConnectionsResponse>("/connections");
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connected = useMemo(() => {
    if (!data) return [];
    return data.mine.filter((c) => c.status === "ACCEPTED");
  }, [data]);

  const outgoing = useMemo(() => {
    if (!data || !me) return [];
    return data.mine.filter(
      (c) => c.status === "PENDING" && c.requester.id === me.id,
    );
  }, [data, me]);

  const incoming = data?.incoming ?? [];

  const filteredIncoming = useMemo(
    () =>
      incoming.filter((c) => matchesConnectionQuery(c.requester, query.trim())),
    [incoming, query],
  );

  const filteredConnected = useMemo(
    () =>
      connected.filter((c) =>
        matchesConnectionQuery(otherUser(me?.id, c), query.trim()),
      ),
    [connected, me?.id, query],
  );

  const filteredOutgoing = useMemo(
    () =>
      outgoing.filter((c) =>
        matchesConnectionQuery(otherUser(me?.id, c), query.trim()),
      ),
    [outgoing, me?.id, query],
  );

  async function respond(id: string, accept: boolean) {
    setBusyId(id);
    try {
      await apiFetch(`/connections/${id}/${accept ? "accept" : "reject"}`, {
        method: "PATCH",
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function disconnect(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/connections/${id}`, { method: "DELETE" });
      setDisconnectTarget(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading connections…</p>;
  }

  if (!data) return null;

  const showRequests = tab === "all" || tab === "requests";
  const showConnected = tab === "all" || tab === "connected";
  const showSent = tab === "all" || tab === "sent";

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    {
      id: "all",
      label: "All",
      count: connected.length + incoming.length + outgoing.length,
    },
    { id: "connected", label: "Connected", count: connected.length },
    { id: "requests", label: "Requests", count: incoming.length },
    { id: "sent", label: "Sent", count: outgoing.length },
  ];

  const emptySearch =
    query.trim() &&
    filteredIncoming.length === 0 &&
    filteredConnected.length === 0 &&
    filteredOutgoing.length === 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className="text-sm text-muted">
          Manage requests and people you already know — message, review, or
          disconnect.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={<Users className="h-4 w-4" />}
          label="Connected"
          value={connected.length}
          active={tab === "connected"}
          onClick={() => setTab("connected")}
        />
        <StatTile
          icon={<Inbox className="h-4 w-4" />}
          label="New requests"
          value={incoming.length}
          highlight={incoming.length > 0}
          active={tab === "requests"}
          onClick={() => setTab("requests")}
        />
        <StatTile
          icon={<Send className="h-4 w-4" />}
          label="Sent"
          value={outgoing.length}
          active={tab === "sent"}
          onClick={() => setTab("sent")}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Search connections</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your network…"
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

        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id
                  ? "bg-foreground text-background"
                  : "bg-surface-elevated text-muted hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1.5 tabular-nums opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {emptySearch ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          No people match “{query.trim()}”.
        </p>
      ) : (
        <div className="space-y-8">
          {showRequests && (tab === "requests" || filteredIncoming.length > 0) ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                  New requests
                </h2>
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-accent">
                  {filteredIncoming.length}
                </span>
              </div>
              {filteredIncoming.length === 0 ? (
                <EmptyPanel>
                  {incoming.length === 0
                    ? "No pending requests right now."
                    : "No matching requests."}
                </EmptyPanel>
              ) : (
                <ul className="grid auto-rows-fr gap-2 lg:grid-cols-2">
                  {filteredIncoming.map((c) => (
                    <IncomingRequestRow
                      key={c.id}
                      user={c.requester}
                      createdAt={c.createdAt}
                      onAccept={() => void respond(c.id, true)}
                      onDecline={() => void respond(c.id, false)}
                      busy={busyId === c.id}
                    />
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {showConnected ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                  Your network
                </h2>
                <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted">
                  {filteredConnected.length}
                </span>
              </div>
              {filteredConnected.length === 0 ? (
                <EmptyPanel>
                  {connected.length === 0 ? (
                    <>
                      No connections yet.{" "}
                      <Link
                        href="/discover"
                        className="text-accent hover:underline"
                      >
                        Discover people
                      </Link>{" "}
                      to connect.
                    </>
                  ) : (
                    "No matching connections."
                  )}
                </EmptyPanel>
              ) : (
                <ul className="grid auto-rows-fr gap-2 lg:grid-cols-2">
                  {filteredConnected.map((c) => {
                    const other = otherUser(me?.id, c);
                    return (
                      <ConnectedPersonRow
                        key={c.id}
                        user={other}
                        onDisconnect={() =>
                          setDisconnectTarget({
                            id: c.id,
                            name: other.displayName,
                          })
                        }
                        busy={busyId === c.id}
                      />
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          {showSent && (tab === "sent" || filteredOutgoing.length > 0) ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                  Sent requests
                </h2>
                <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted">
                  {filteredOutgoing.length}
                </span>
              </div>
              {filteredOutgoing.length === 0 ? (
                <EmptyPanel>
                  {outgoing.length === 0
                    ? "You haven’t sent any pending requests."
                    : "No matching sent requests."}
                </EmptyPanel>
              ) : (
                <ul className="grid auto-rows-fr gap-2 lg:grid-cols-2">
                  {filteredOutgoing.map((c) => (
                    <OutgoingRequestRow
                      key={c.id}
                      user={otherUser(me?.id, c)}
                      onCancel={() => void disconnect(c.id)}
                      busy={busyId === c.id}
                    />
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(disconnectTarget)}
        title="Remove connection?"
        description={
          disconnectTarget
            ? `You will no longer be connected with ${disconnectTarget.name}. You can send a new request later if you change your mind.`
            : ""
        }
        confirmLabel="Remove connection"
        cancelLabel="Keep connection"
        busy={Boolean(disconnectTarget && busyId === disconnectTarget.id)}
        onConfirm={() => {
          if (disconnectTarget) void disconnect(disconnectTarget.id);
        }}
        onClose={() => {
          if (!busyId) setDisconnectTarget(null);
        }}
      />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  highlight,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-foreground/20 bg-foreground text-background"
          : highlight
            ? "border-accent/30 bg-accent/10 hover:bg-accent/15"
            : "border-border bg-surface-elevated/60 hover:bg-surface-elevated"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-xs ${
          active ? "text-background/70" : "text-muted"
        }`}
      >
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </button>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}
