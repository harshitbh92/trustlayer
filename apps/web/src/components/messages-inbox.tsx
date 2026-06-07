"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  ConversationListItem,
  groupConversationsByDate,
} from "@/components/conversation-list-item";
import type { PublicUser } from "@trustlayer/shared";

export interface ConversationPreview {
  id: string;
  updatedAt: string;
  otherUser: PublicUser | null;
  lastMessage: {
    id: string;
    content: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    deletedAt?: string | null;
    senderId: string;
    createdAt: string;
  } | null;
}

export function MessagesInbox({
  onSelectConversation,
}: {
  onSelectConversation: (id: string) => void;
}) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    apiFetch<ConversationPreview[]>("/conversations")
      .then(setConversations)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">Loading messages…</p>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-center text-sm text-muted">
          No conversations yet. Message someone from your connections.
        </p>
      </div>
    );
  }

  const grouped = groupConversationsByDate(conversations);

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-2">
      {grouped.map((group) => (
        <section key={group.label} className="mb-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
            {group.label}
          </h2>
          <div className="space-y-2">
            {group.items.map((c) => (
              <ConversationListItem
                key={c.id}
                conversation={c}
                viewerId={user!.id}
                onSelect={onSelectConversation}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
