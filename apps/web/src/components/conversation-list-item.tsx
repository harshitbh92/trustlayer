"use client";

import Link from "next/link";
import clsx from "clsx";
import { UserAvatar } from "@/components/user-avatar";
import { messagePreviewText } from "@/components/media-content";
import type { PublicUser } from "@trustlayer/shared";

export interface InboxItem {
  otherUser: PublicUser;
  conversationId: string | null;
  lastMessage: {
    content: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    deletedAt?: string | null;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  sortAt: string;
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

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Yesterday";

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationListItem({
  item,
  viewerId,
  onSelect,
}: {
  item: InboxItem;
  viewerId: string;
  onSelect?: (item: InboxItem) => void;
}) {
  const other = item.otherUser;
  const hasUnread = item.unreadCount > 0;
  const preview = item.lastMessage
    ? messagePreviewText(item.lastMessage)
    : "Tap to start chatting";
  const fromMe = item.lastMessage?.senderId === viewerId;
  const time = item.lastMessage?.createdAt ?? item.sortAt;

  const className = clsx(
    "flex w-full items-center gap-3 px-4 py-3 text-left transition",
    hasUnread ? "bg-accent/5 hover:bg-accent/10" : "hover:bg-surface-elevated/80",
  );

  const content = (
    <>
      <div className="relative shrink-0">
        <UserAvatar
          displayName={other.displayName}
          avatarUrl={other.avatarUrl}
          size="md"
        />
        {hasUnread ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {item.unreadCount > 99 ? "99+" : item.unreadCount}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={clsx(
              "truncate",
              hasUnread ? "font-semibold text-foreground" : "font-medium",
            )}
          >
            {other.displayName}
          </p>
          <span
            className={clsx(
              "shrink-0 text-xs",
              hasUnread ? "font-medium text-accent" : "text-muted",
            )}
          >
            {formatPreviewTime(time)}
          </span>
        </div>
        <p
          className={clsx(
            "mt-0.5 truncate text-sm",
            hasUnread ? "font-medium text-foreground/90" : "text-muted",
          )}
        >
          {item.lastMessage
            ? fromMe
              ? `You: ${preview}`
              : preview
            : preview}
        </p>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(item)} className={className}>
        {content}
      </button>
    );
  }

  const href = item.conversationId
    ? `/messages/${item.conversationId}`
    : `/profile/${other.username}`;

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
