"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { startConversation } from "@/lib/messages";
import { useAuth } from "@/lib/auth-context";
import { UserAvatar } from "@/components/user-avatar";
import type { PublicUser } from "@trustlayer/shared";
import type { FeedPost } from "@/components/post-card";

interface MineConnection {
  id: string;
  status: string;
  requester: PublicUser;
  receiver: PublicUser;
}

interface ConnectionsResponse {
  mine: MineConnection[];
}

function otherUser(meId: string | undefined, c: MineConnection): PublicUser {
  return meId === c.requester.id ? c.receiver : c.requester;
}

function postShareText(post: FeedPost): string {
  const snippet = post.content.trim().slice(0, 120);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/feed`;
  const prefix = `Shared a post from @${post.author.username}`;
  if (snippet) {
    return `${prefix}: "${snippet}${post.content.length > 120 ? "…" : ""}"\n${link}`;
  }
  return `${prefix}.\n${link}`;
}

export function SharePostModal({
  post,
  open,
  onClose,
}: {
  post: FeedPost;
  open: boolean;
  onClose: () => void;
}) {
  const { user: me } = useAuth();
  const [connections, setConnections] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUsername, setBusyUsername] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSentTo(null);
    setError(null);
    apiFetch<ConnectionsResponse>("/connections")
      .then((res) => {
        const accepted = res.mine
          .filter((c) => c.status === "ACCEPTED")
          .map((c) => otherUser(me?.id, c));
        setConnections(accepted);
      })
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [open, me?.id]);

  const sorted = useMemo(
    () =>
      [...connections].sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    [connections],
  );

  async function shareWith(username: string) {
    setBusyUsername(username);
    setError(null);
    try {
      const conversation = await startConversation(username);
      await apiFetch(`/conversations/${conversation.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: postShareText(post) }),
      });
      setSentTo(username);
    } catch {
      setError("Could not share. Try again.");
    } finally {
      setBusyUsername(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="surface-elevated flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Share post</h2>
            <p className="text-xs text-muted">
              Send to a connection via message
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="px-3 py-6 text-sm text-muted">Loading connections…</p>
          ) : sorted.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted">
              No accepted connections yet. Connect with someone to share.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sorted.map((person) => {
                const sending = busyUsername === person.username;
                const done = sentTo === person.username;
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      disabled={Boolean(busyUsername) || done}
                      onClick={() => void shareWith(person.username)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface disabled:opacity-60"
                    >
                      <UserAvatar
                        displayName={person.displayName}
                        avatarUrl={person.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {person.displayName}
                        </p>
                        <p className="truncate text-xs text-muted">
                          @{person.username}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-accent">
                        {done ? "Sent" : sending ? "Sending…" : "Send"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error ? (
          <p className="border-t border-border px-5 py-3 text-xs text-rose-500">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
