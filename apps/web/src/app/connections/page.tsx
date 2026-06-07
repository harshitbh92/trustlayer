"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ProfileCard } from "@/components/profile-card";
import { MessageButton } from "@/components/message-button";
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
  requester: PublicUser;
  receiver: PublicUser;
}
interface ConnectionsResponse {
  incoming: Incoming[];
  mine: Mine[];
}

export default function ConnectionsPage() {
  const { user: me } = useAuth();
  const [data, setData] = useState<ConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch<ConnectionsResponse>("/connections");
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string, accept: boolean) {
    await apiFetch(`/connections/${id}/${accept ? "accept" : "reject"}`, {
      method: "PATCH",
    });
    await load();
  }

  async function disconnect(id: string) {
    await apiFetch(`/connections/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold">Incoming requests</h1>
        {data.incoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No pending requests.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.incoming.map((c) => (
              <li key={c.id}>
                <ProfileCard
                  user={c.requester}
                  action={
                    <div className="flex gap-2">
                      <button
                        onClick={() => respond(c.id, true)}
                        className="btn-primary text-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respond(c.id, false)}
                        className="btn-ghost text-sm"
                      >
                        Decline
                      </button>
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Your connections</h2>
        {data.mine.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No connections yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.mine.map((c) => {
              const other = me?.id === c.requester.id ? c.receiver : c.requester;
              return (
                <li key={c.id}>
                  <ProfileCard
                    user={other}
                    action={
                      c.status === "ACCEPTED" ? (
                        <div className="flex flex-wrap gap-2">
                          <MessageButton username={other.username} />
                          <button
                            onClick={() => disconnect(c.id)}
                            className="btn-ghost text-sm"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : c.status === "PENDING" && me?.id === c.requester.id ? (
                        <button
                          onClick={() => disconnect(c.id)}
                          className="btn-ghost text-sm"
                        >
                          Cancel request
                        </button>
                      ) : (
                        <span className="text-xs text-muted">
                          {c.status === "PENDING" ? "Pending" : "Declined"}
                        </span>
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
