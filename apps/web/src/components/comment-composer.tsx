"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { uploadMedia } from "@/lib/upload";
import {
  RichComposerToolbar,
  usePendingMedia,
} from "@/components/rich-composer-toolbar";

export function CommentComposer({
  postId,
  parentId,
  placeholder = "Write a reply…",
  onPosted,
  autoFocus,
}: {
  postId: string;
  parentId?: string;
  placeholder?: string;
  onPosted: () => void;
  autoFocus?: boolean;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { pendingMedia, setMedia, clearPendingMedia } = usePendingMedia();

  const canSubmit =
    Boolean(content.trim() || pendingMedia) && !busy && !uploading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setUploading(Boolean(pendingMedia));
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

      await apiFetch(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          content: content.trim(),
          imageUrl,
          videoUrl,
          parentId,
        }),
      });
      setContent("");
      clearPendingMedia();
      onPosted();
    } finally {
      setBusy(false);
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={1000}
          autoFocus={autoFocus}
          className="input py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary shrink-0 px-3 text-sm"
          aria-label="Send reply"
        >
          {uploading ? "…" : busy ? "…" : <Send className="h-4 w-4" />}
        </button>
      </div>

      <RichComposerToolbar
        disabled={busy || uploading}
        pendingMedia={pendingMedia}
        onClearMedia={clearPendingMedia}
        onEmoji={(emoji) => setContent((value) => `${value}${emoji}`)}
        onMediaSelected={setMedia}
      />
    </form>
  );
}
