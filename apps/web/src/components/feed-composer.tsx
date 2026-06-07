"use client";

import { useState } from "react";
import { uploadMedia } from "@/lib/upload";
import {
  RichComposerToolbar,
  usePendingMedia,
} from "@/components/rich-composer-toolbar";

export interface FeedPublishPayload {
  content: string;
  imageUrl?: string;
  videoUrl?: string;
}

export function FeedComposer({
  onPublish,
  busy,
}: {
  onPublish: (payload: FeedPublishPayload) => Promise<void>;
  busy: boolean;
}) {
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const { pendingMedia, setMedia, clearPendingMedia } = usePendingMedia();

  const canSubmit =
    Boolean(content.trim() || pendingMedia) && !busy && !uploading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setUploading(true);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      if (pendingMedia) {
        const uploaded = await uploadMedia(pendingMedia.file);
        if (uploaded.mediaType === "image") {
          imageUrl = uploaded.url;
        } else {
          videoUrl = uploaded.url;
        }
      }

      await onPublish({
        content: content.trim(),
        imageUrl,
        videoUrl,
      });
      setContent("");
      clearPendingMedia();
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface-elevated p-4 sm:p-5">
      <p className="label mb-3">Share with your network</p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Share something thoughtful…"
        className="input resize-none"
      />

      <div className="mt-3">
        <RichComposerToolbar
          disabled={busy || uploading}
          pendingMedia={pendingMedia}
          onClearMedia={clearPendingMedia}
          onEmoji={(emoji) => setContent((value) => `${value}${emoji}`)}
          onMediaSelected={setMedia}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{content.length}/1000</p>
        <button type="submit" disabled={!canSubmit} className="btn-primary">
          {uploading ? "Uploading…" : busy ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
