"use client";

import clsx from "clsx";
import { Play } from "lucide-react";
import { DELETED_MESSAGE_LABEL } from "@trustlayer/shared";

export function MediaContent({
  content,
  imageUrl,
  videoUrl,
  mediaUrl,
  mediaType,
  className,
  compact,
  onMediaClick,
}: {
  content?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  className?: string;
  compact?: boolean;
  onMediaClick?: (url: string, type: "image" | "video") => void;
}) {
  const text = content?.trim();
  const image = imageUrl ?? (mediaType === "image" ? mediaUrl : null);
  const video = videoUrl ?? (mediaType === "video" ? mediaUrl : null);
  const hasMediaOnly = Boolean((image || video) && !text);

  return (
    <div className={clsx(hasMediaOnly ? "space-y-0" : "space-y-2", className)}>
      {image ? (
        <button
          type="button"
          onClick={() => onMediaClick?.(image, "image")}
          className={clsx(
            "block overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            onMediaClick && "cursor-zoom-in",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className={clsx(
              "object-cover",
              compact ? "max-h-52 w-full min-w-[200px]" : "max-h-96 w-full",
            )}
          />
        </button>
      ) : null}
      {video ? (
        <button
          type="button"
          onClick={() => onMediaClick?.(video, "video")}
          className={clsx(
            "relative block w-full overflow-hidden rounded-xl bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            onMediaClick && "cursor-pointer",
          )}
        >
          <video
            src={video}
            className={clsx(
              "pointer-events-none w-full object-cover",
              compact ? "max-h-52 min-w-[200px]" : "max-h-96",
            )}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
            </span>
          </span>
        </button>
      ) : null}
      {text ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      ) : null}
    </div>
  );
}

export function messagePreviewText(input: {
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  deletedAt?: string | null;
}) {
  if (input.deletedAt) return DELETED_MESSAGE_LABEL;
  const text = input.content?.trim();
  if (text) return text;
  if (input.mediaType === "image") return "Photo";
  if (input.mediaType === "video") return "Video";
  return "Message";
}
