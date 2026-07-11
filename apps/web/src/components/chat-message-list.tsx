"use client";

import { useCallback, useState } from "react";
import clsx from "clsx";
import { CheckCheck, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { MediaContent } from "@/components/media-content";
import {
  MessageContextMenu,
  useLongPress,
  type MessageContextMenuState,
} from "@/components/message-context-menu";
import {
  InlineReplyPreview,
  MessageReactions,
} from "@/components/message-reply-preview";
import { buildChatListEntries } from "@/lib/chat-message-utils";
import {
  canDeleteMessage,
  DELETED_MESSAGE_LABEL,
  type MessageReactionEmoji,
} from "@trustlayer/shared";
import type { ChatMessage } from "@/lib/use-conversation-socket";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function menuPositionFromEvent(
  event: React.MouseEvent | React.TouchEvent,
): { x: number; y: number } {
  if ("touches" in event && event.touches[0]) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  if ("clientX" in event) {
    return { x: event.clientX, y: event.clientY };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function MessageBubble({
  msg,
  showHeader,
  isGrouped,
  onDeleteRequest,
  onMediaOpen,
  onReply,
  onReact,
  onCopy,
  onOpenMenu,
}: {
  msg: ChatMessage;
  showHeader: boolean;
  isGrouped: boolean;
  onDeleteRequest?: (messageId: string) => void;
  onMediaOpen?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: MessageReactionEmoji) => void;
  onCopy?: (messageId: string) => void;
  onOpenMenu?: (state: MessageContextMenuState) => void;
}) {
  const deleted = Boolean(msg.deletedAt);
  const deletable =
    msg.fromMe && canDeleteMessage(msg.createdAt, msg.deletedAt);
  const hasMedia =
    !deleted &&
    msg.mediaUrl &&
    (msg.mediaType === "image" || msg.mediaType === "video");
  const hasCaption = Boolean(msg.content?.trim());
  const hasReply = Boolean(msg.replyTo);
  const canCopy = Boolean(!deleted && msg.content?.trim());

  const openMenu = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      const { x, y } = menuPositionFromEvent(event);
      onOpenMenu?.({
        messageId: msg.id,
        x,
        y,
        canCopy,
        canDelete: deletable,
      });
    },
    [canCopy, deletable, msg.id, onOpenMenu],
  );

  const longPressHandlers = useLongPress(openMenu);

  return (
    <div
      className={clsx(
        "group flex max-w-[85%] flex-col",
        isGrouped ? "mt-0.5" : "mt-3",
        msg.fromMe ? "ml-auto items-end" : "items-start",
      )}
    >
      {showHeader ? (
        <div
          className={clsx(
            "mb-1 flex items-center gap-2 px-1 text-xs text-muted",
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
        </div>
      ) : null}

      <div className={clsx("relative", msg.fromMe ? "items-end" : "items-start")}>
        <div
          {...longPressHandlers}
          onContextMenu={(event) => {
            event.preventDefault();
            openMenu(event);
          }}
          className={clsx(
            "relative overflow-hidden select-none",
            deleted
              ? "rounded-2xl bg-surface/80 px-4 py-2.5 italic text-muted"
              : hasMedia && !hasCaption && !hasReply
                ? clsx(
                    "rounded-2xl",
                    msg.fromMe ? "rounded-tr-md" : "rounded-tl-md",
                  )
                : clsx(
                    "rounded-2xl px-3 py-2",
                    msg.fromMe
                      ? "rounded-tr-md bg-accent/20 text-foreground"
                      : "rounded-tl-md border border-border bg-surface-elevated",
                  ),
          )}
        >
          {deleted ? (
            <p className="text-sm">{DELETED_MESSAGE_LABEL}</p>
          ) : (
            <>
              {msg.replyTo ? (
                <InlineReplyPreview reply={msg.replyTo} fromMe={msg.fromMe} />
              ) : null}
              <MediaContent
                content={msg.content}
                mediaUrl={msg.mediaUrl}
                mediaType={msg.mediaType}
                compact
                onMediaClick={
                  onMediaOpen && hasMedia
                    ? () => onMediaOpen(msg.id)
                    : undefined
                }
              />
            </>
          )}

          {!deleted ? (
            <div
              className={clsx(
                "flex items-center justify-end gap-1",
                hasMedia && !hasCaption && !hasReply
                  ? "absolute bottom-1.5 right-2 rounded-md bg-black/50 px-1.5 py-0.5"
                  : "mt-1",
              )}
            >
              <span
                className={clsx(
                  "text-[10px] leading-none",
                  hasMedia && !hasCaption && !hasReply
                    ? "text-white/90"
                    : "text-muted",
                )}
              >
                {formatTime(msg.createdAt)}
              </span>
              {msg.fromMe ? (
                <CheckCheck
                  className={clsx(
                    "h-3 w-3",
                    hasMedia && !hasCaption && !hasReply
                      ? "text-white/90"
                      : "text-accent",
                  )}
                  aria-label="Sent"
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {!deleted && msg.reactions && msg.reactions.length > 0 ? (
          <MessageReactions
            reactions={msg.reactions}
            onToggle={(emoji) =>
              onReact?.(msg.id, emoji as MessageReactionEmoji)
            }
            className={msg.fromMe ? "justify-end" : "justify-start"}
          />
        ) : null}

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
}

export function ChatMessageList({
  messages,
  className,
  onDeleteRequest,
  onMediaOpen,
  onReply,
  onReact,
  onCopy,
}: {
  messages: ChatMessage[];
  className?: string;
  onDeleteRequest?: (messageId: string) => void;
  onMediaOpen?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: MessageReactionEmoji) => void;
  onCopy?: (messageId: string) => void;
}) {
  const [menu, setMenu] = useState<MessageContextMenuState | null>(null);
  const entries = buildChatListEntries(messages);

  return (
    <>
      <div className={clsx("flex w-full flex-col", className)}>
        {entries.map((entry) => {
          if (entry.kind === "date") {
            return (
              <div key={entry.key} className="my-4 flex justify-center">
                <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted shadow-sm">
                  {entry.label}
                </span>
              </div>
            );
          }

          const { message: msg, showHeader, isGrouped } = entry;

          return (
            <MessageBubble
              key={entry.key}
              msg={msg}
              showHeader={showHeader}
              isGrouped={isGrouped}
              onDeleteRequest={onDeleteRequest}
              onMediaOpen={onMediaOpen}
              onReply={onReply}
              onReact={onReact}
              onCopy={onCopy}
              onOpenMenu={setMenu}
            />
          );
        })}
      </div>

      <MessageContextMenu
        menu={menu}
        onClose={() => setMenu(null)}
        onReply={(id) => onReply?.(id)}
        onReact={(id, emoji) => onReact?.(id, emoji)}
        onCopy={(id) => onCopy?.(id)}
        onDelete={(id) => onDeleteRequest?.(id)}
      />
    </>
  );
}
