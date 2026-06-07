"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { messagePreviewText } from "@/components/media-content";
import type { PublicUser } from "@trustlayer/shared";

interface ConversationPreview {
  id: string;
  updatedAt: string;
  otherUser: PublicUser | null;
  lastMessage: {
    content: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    deletedAt?: string | null;
    senderId: string;
    createdAt: string;
  } | null;
}

function formatPreviewTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationListItem({
  conversation,
  viewerId,
  onSelect,
}: {
  conversation: ConversationPreview;
  viewerId: string;
  onSelect?: (conversationId: string) => void;
}) {
  const other = conversation.otherUser;
  if (!other) return null;

  const preview = conversation.lastMessage
    ? messagePreviewText(conversation.lastMessage)
    : "No messages yet";
  const fromMe = conversation.lastMessage?.senderId === viewerId;
  const time = conversation.lastMessage?.createdAt ?? conversation.updatedAt;

  const className =
    "flex w-full items-center gap-3 rounded-xl border border-border bg-surface-elevated/60 p-3 text-left transition hover:bg-surface-elevated";

  const content = (
    <>
      <UserAvatar
        displayName={other.displayName}
        avatarUrl={other.avatarUrl}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{other.displayName}</p>
          <span className="shrink-0 text-xs text-muted">
            {formatPreviewTime(time)}
          </span>
        </div>
        <p className="truncate text-sm text-muted">
          {fromMe ? `You: ${preview}` : preview}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={`/messages/${conversation.id}`} className={className}>
      {content}
    </Link>
  );
}

export function groupConversationsByDate(
  conversations: ConversationPreview[],
): { label: string; items: ConversationPreview[] }[] {
  const groups = new Map<string, ConversationPreview[]>();

  for (const c of conversations) {
    const date = new Date(c.updatedAt);
    const label = date.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const list = groups.get(label) ?? [];
    list.push(c);
    groups.set(label, list);
  }

  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}
