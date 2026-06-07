"use client";

import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { MediaContent } from "@/components/media-content";
import {
  canDeleteMessage,
  DELETED_MESSAGE_LABEL,
} from "@trustlayer/shared";
import type { ChatMessage } from "@/lib/use-conversation-socket";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatMessageList({
  messages,
  className,
  onDeleteRequest,
}: {
  messages: ChatMessage[];
  className?: string;
  onDeleteRequest?: (messageId: string) => void;
}) {
  return (
    <div className={clsx("flex w-full flex-col gap-4", className)}>
      {messages.map((msg) => {
        const deleted = Boolean(msg.deletedAt);
        const deletable =
          msg.fromMe && canDeleteMessage(msg.createdAt, msg.deletedAt);

        return (
          <div
            key={msg.id}
            className={clsx(
              "group flex max-w-[85%] flex-col gap-1",
              msg.fromMe ? "ml-auto items-end" : "items-start",
            )}
          >
            <div
              className={clsx(
                "flex items-center gap-2 text-xs text-muted",
                msg.fromMe && "flex-row-reverse",
              )}
            >
              {!msg.fromMe && (
                <UserAvatar
                  displayName={msg.sender.displayName}
                  avatarUrl={msg.sender.avatarUrl}
                  size="sm"
                />
              )}
              <span className="font-medium text-foreground">
                {msg.fromMe ? "You" : msg.sender.displayName}
              </span>
              <span>{formatTime(msg.createdAt)}</span>
            </div>

            <div
              className={clsx(
                "relative rounded-2xl px-4 py-2.5",
                msg.fromMe
                  ? "rounded-tr-md bg-accent/20 text-foreground"
                  : "rounded-tl-md border border-border bg-surface-elevated",
                deleted && "bg-surface/80 italic text-muted",
              )}
            >
              {deleted ? (
                <p className="text-sm">{DELETED_MESSAGE_LABEL}</p>
              ) : (
                <MediaContent
                  content={msg.content}
                  mediaUrl={msg.mediaUrl}
                  mediaType={msg.mediaType}
                  compact
                />
              )}

              {deletable && onDeleteRequest ? (
                <button
                  type="button"
                  onClick={() => onDeleteRequest(msg.id)}
                  className={clsx(
                    "absolute -top-2 rounded-full border border-border bg-background p-1 text-muted opacity-0 transition hover:text-rose-500 group-hover:opacity-100",
                    msg.fromMe ? "-left-2" : "-right-2",
                  )}
                  aria-label="Delete message"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
