"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { messagePreviewText } from "@/components/media-content";
import type { MessageReplyPreview } from "@/lib/use-conversation-socket";

export function InlineReplyPreview({
  reply,
  fromMe,
  compact,
}: {
  reply: MessageReplyPreview;
  fromMe: boolean;
  compact?: boolean;
}) {
  const preview = messagePreviewText(reply);

  return (
    <div
      className={clsx(
        "mb-2 border-l-2 pl-2",
        fromMe ? "border-accent/60" : "border-accent",
      )}
    >
      <p className="text-xs font-semibold text-accent">
        {reply.sender.displayName}
      </p>
      <p
        className={clsx(
          "truncate text-xs text-muted",
          compact ? "max-w-[180px]" : "max-w-[240px]",
        )}
      >
        {preview}
      </p>
    </div>
  );
}

export function ComposerReplyBar({
  reply,
  onClear,
}: {
  reply: MessageReplyPreview;
  onClear: () => void;
}) {
  const preview = messagePreviewText(reply);

  return (
    <div className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2">
      <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
        <p className="text-xs font-semibold text-accent">
          Replying to {reply.sender.displayName}
        </p>
        <p className="truncate text-xs text-muted">{preview}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-full p-1 text-muted transition hover:bg-surface-elevated hover:text-foreground"
        aria-label="Cancel reply"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function MessageReactions({
  reactions,
  onToggle,
  className,
}: {
  reactions: { emoji: string; count: number; reactedByMe: boolean }[];
  onToggle?: (emoji: string) => void;
  className?: string;
}) {
  if (reactions.length === 0) return null;

  return (
    <div className={clsx("mt-1 flex flex-wrap gap-1", className)}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle?.(reaction.emoji)}
          className={clsx(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition",
            reaction.reactedByMe
              ? "border-accent/40 bg-accent/15 text-foreground"
              : "border-border bg-surface-elevated text-muted hover:border-accent/30",
          )}
        >
          <span>{reaction.emoji}</span>
          {reaction.count > 1 ? (
            <span className="font-medium">{reaction.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
