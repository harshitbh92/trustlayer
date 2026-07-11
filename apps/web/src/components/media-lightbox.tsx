"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import clsx from "clsx";
import { MESSAGE_REACTION_EMOJIS, type MessageReactionEmoji } from "@trustlayer/shared";

export interface LightboxMedia {
  messageId: string;
  url: string;
  mediaType: "image" | "video";
  senderName?: string;
  createdAt?: string;
  reactions?: { emoji: string; count: number; reactedByMe: boolean }[];
}

export function MediaLightbox({
  open,
  media,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  onReact,
}: {
  open: boolean;
  media: LightboxMedia | null;
  index: number;
  total: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onReact?: (messageId: string, emoji: MessageReactionEmoji) => void;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev?.();
      if (event.key === "ArrowRight") onNext?.();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, onPrev, onNext]);

  if (!open || !media) return null;

  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="min-w-0">
          {media.senderName ? (
            <p className="truncate text-sm font-medium">{media.senderName}</p>
          ) : null}
          {media.createdAt ? (
            <p className="text-xs text-white/60">
              {new Date(media.createdAt).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <a
            href={media.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Download"
          >
            <Download className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        {hasPrev && onPrev ? (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70 sm:left-4"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : null}

        <div className="flex max-h-full max-w-full items-center justify-center">
          {media.mediaType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt=""
              className="max-h-[calc(100vh-8rem)] max-w-full object-contain"
            />
          ) : (
            <video
              src={media.url}
              controls
              autoPlay
              playsInline
              className="max-h-[calc(100vh-8rem)] max-w-full rounded-lg"
            />
          )}
        </div>

        {hasNext && onNext ? (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70 sm:right-4"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        ) : null}
      </div>

      {total > 1 ? (
        <p className="shrink-0 pb-2 text-center text-xs text-white/50">
          {index + 1} of {total}
        </p>
      ) : null}

      {onReact && media ? (
        <div className="flex shrink-0 flex-col items-center gap-2 pb-4">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
            {MESSAGE_REACTION_EMOJIS.map((emoji) => {
              const active = media.reactions?.some(
                (r) => r.emoji === emoji && r.reactedByMe,
              );
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(media.messageId, emoji)}
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-full text-xl transition",
                    active
                      ? "bg-white/25 ring-2 ring-white/40"
                      : "hover:bg-white/15",
                  )}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          {media.reactions && media.reactions.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1">
              {media.reactions.map((reaction) => (
                <span
                  key={reaction.emoji}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/90"
                >
                  {reaction.emoji}
                  {reaction.count > 1 ? ` ${reaction.count}` : ""}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
