"use client";

import { useState } from "react";
import { uploadMedia } from "@/lib/upload";
import {
  RichComposerToolbar,
  usePendingMedia,
} from "@/components/rich-composer-toolbar";
import {
  POST_VISIBILITY_LABELS,
  PostVisibility,
  type PostVisibility as PostVisibilityType,
} from "@trustlayer/shared";
import { Globe2, Users } from "lucide-react";
import clsx from "clsx";

export interface FeedPublishPayload {
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  visibility: PostVisibilityType;
}

export function FeedComposer({
  onPublish,
  busy,
}: {
  onPublish: (payload: FeedPublishPayload) => Promise<void>;
  busy: boolean;
}) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<PostVisibilityType>(
    PostVisibility.PUBLIC,
  );
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
        visibility,
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
        rows={4}
        placeholder="Share something thoughtful…"
        className="input resize-none"
      />

      <div className="mt-3">
        <p className="mb-2 text-xs font-medium text-muted">Audience</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                value: PostVisibility.PUBLIC,
                icon: Globe2,
                hint: "Anyone on TrustLayer",
              },
              {
                value: PostVisibility.CONNECTIONS,
                icon: Users,
                hint: "Accepted connections only",
              },
            ] as const
          ).map(({ value, icon: Icon, hint }) => {
            const selected = visibility === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                className={clsx(
                  "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition",
                  selected
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-surface text-muted hover:border-accent/40",
                )}
              >
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="h-3.5 w-3.5" />
                  {POST_VISIBILITY_LABELS[value]}
                </span>
                <span className="text-[11px] leading-snug opacity-80">
                  {hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
