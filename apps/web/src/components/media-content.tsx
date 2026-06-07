"use client";

import clsx from "clsx";
import { DELETED_MESSAGE_LABEL } from "@trustlayer/shared";

export function MediaContent({
  content,
  imageUrl,
  videoUrl,
  mediaUrl,
  mediaType,
  className,
  compact,
}: {
  content?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const text = content?.trim();
  const image = imageUrl ?? (mediaType === "image" ? mediaUrl : null);
  const video = videoUrl ?? (mediaType === "video" ? mediaUrl : null);

  return (
    <div className={clsx("space-y-2", className)}>
      {text ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      ) : null}
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className={clsx(
            "rounded-xl border border-border object-cover",
            compact ? "max-h-40 w-full" : "max-h-96 w-full",
          )}
        />
      ) : null}
      {video ? (
        <video
          src={video}
          controls
          className={clsx(
            "rounded-xl border border-border bg-black",
            compact ? "max-h-40 w-full" : "max-h-96 w-full",
          )}
        />
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
