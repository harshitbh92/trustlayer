"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { uploadMedia } from "@/lib/upload";
import type { MediaType } from "@trustlayer/shared";
import {
  RichComposerToolbar,
  usePendingMedia,
} from "@/components/rich-composer-toolbar";

export interface ChatSendPayload {
  content: string;
  mediaUrl?: string;
  mediaType?: MediaType;
}

export function ChatComposer({
  onSend,
  disabled,
  placeholder = "Write a message…",
}: {
  onSend: (payload: ChatSendPayload) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const { pendingMedia, setMedia, clearPendingMedia } = usePendingMedia();

  const canSubmit =
    Boolean(value.trim() || pendingMedia) && !disabled && !uploading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setUploading(true);
    try {
      let mediaUrl: string | undefined;
      let mediaType: MediaType | undefined;

      if (pendingMedia) {
        const uploaded = await uploadMedia(pendingMedia.file);
        mediaUrl = uploaded.url;
        mediaType = uploaded.mediaType;
      }

      onSend({
        content: value.trim(),
        mediaUrl,
        mediaType,
      });
      setValue("");
      clearPendingMedia();
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-2 border-t border-border bg-surface-elevated/80 p-3 backdrop-blur"
    >
      <RichComposerToolbar
        disabled={disabled || uploading}
        pendingMedia={pendingMedia}
        onClearMedia={clearPendingMedia}
        onEmoji={(emoji) => setValue((current) => `${current}${emoji}`)}
        onMediaSelected={setMedia}
      />

      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={1}
          maxLength={2000}
          disabled={disabled || uploading}
          className="input max-h-32 min-h-[44px] resize-none py-2.5"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary shrink-0 px-3"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
