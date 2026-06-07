"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { ImageIcon, Smile, Video, X } from "lucide-react";
import { EmojiPickerPopover } from "@/components/emoji-picker-popover";
import type { MediaType } from "@trustlayer/shared";

export interface PendingMedia {
  file: File;
  previewUrl: string;
  mediaType: MediaType;
}

export function RichComposerToolbar({
  disabled,
  onEmoji,
  onMediaSelected,
  pendingMedia,
  onClearMedia,
}: {
  disabled?: boolean;
  onEmoji: (emoji: string) => void;
  onMediaSelected: (media: PendingMedia) => void;
  pendingMedia: PendingMedia | null;
  onClearMedia: () => void;
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function pickFile(file: File | undefined, mediaType: MediaType) {
    if (!file) return;
    onMediaSelected({
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType,
    });
  }

  return (
    <div className="space-y-3">
      {pendingMedia ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
          {pendingMedia.mediaType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pendingMedia.previewUrl}
              alt="Attachment preview"
              className="max-h-48 w-full object-cover"
            />
          ) : (
            <video
              src={pendingMedia.previewUrl}
              controls
              className="max-h-48 w-full bg-black"
            />
          )}
          <button
            type="button"
            onClick={onClearMedia}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="relative flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEmojiOpen((v) => !v)}
          className={clsx(
            "rounded-lg p-2 text-muted transition hover:bg-surface hover:text-foreground",
            emojiOpen && "bg-surface text-foreground",
          )}
          aria-label="Add emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        <button
          type="button"
          disabled={disabled || Boolean(pendingMedia)}
          onClick={() => imageInputRef.current?.click()}
          className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-40"
          aria-label="Attach image"
        >
          <ImageIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          disabled={disabled || Boolean(pendingMedia)}
          onClick={() => videoInputRef.current?.click()}
          className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-40"
          aria-label="Attach video"
        >
          <Video className="h-5 w-5" />
        </button>

        <EmojiPickerPopover
          open={emojiOpen}
          onSelect={onEmoji}
          onClose={() => setEmojiOpen(false)}
        />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0], "image");
            e.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0], "video");
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export function usePendingMedia() {
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);

  function clearPendingMedia() {
    setPendingMedia((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  }

  function setMedia(media: PendingMedia) {
    clearPendingMedia();
    setPendingMedia(media);
  }

  return { pendingMedia, setMedia, clearPendingMedia };
}
