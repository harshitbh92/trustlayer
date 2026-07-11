"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { startConversation } from "@/lib/messages";
import {
  ConversationListItem,
  type InboxItem,
} from "@/components/conversation-list-item";

export function MessagesInbox({
  onSelectConversation,
  refreshToken = 0,
}: {
  onSelectConversation: (id: string) => void;
  refreshToken?: number;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const inbox = await apiFetch<InboxItem[]>("/conversations");
      setItems(inbox);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  async function handleSelect(item: InboxItem) {
    if (opening) return;

    if (item.conversationId) {
      onSelectConversation(item.conversationId);
      return;
    }

    setOpening(item.otherUser.username);
    try {
      const conv = await startConversation(item.otherUser.username);
      onSelectConversation(conv.id);
    } finally {
      setOpening(null);
    }
  }

  if (loading) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">Loading chats…</p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-center text-sm text-muted">
          No connections yet. Accept a connection request to start messaging.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto divide-y divide-border/60">
      {items.map((item) => (
        <ConversationListItem
          key={item.otherUser.id}
          item={item}
          viewerId={user!.id}
          onSelect={handleSelect}
        />
      ))}
      {opening ? (
        <p className="px-4 py-2 text-center text-xs text-muted">Opening chat…</p>
      ) : null}
    </div>
  );
}
