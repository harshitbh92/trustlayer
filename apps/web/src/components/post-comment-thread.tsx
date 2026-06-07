"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UserAvatar } from "@/components/user-avatar";
import { CommentComposer } from "@/components/comment-composer";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MediaContent } from "@/components/media-content";
import { formatRelativeTime } from "@/lib/format-time";
import {
  canDeleteContent,
  DELETED_COMMENT_LABEL,
  type PublicUser,
} from "@trustlayer/shared";

interface CommentItem {
  id: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  deletedAt: string | null;
  createdAt: string;
  author: PublicUser;
  replies: {
    id: string;
    content: string;
    imageUrl: string | null;
    videoUrl: string | null;
    deletedAt: string | null;
    createdAt: string;
    author: PublicUser;
  }[];
}

export function PostCommentThread({
  postId,
  open,
  onCommentCountChange,
}: {
  postId: string;
  open: boolean;
  onCommentCountChange?: (delta: number) => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: CommentItem[] }>(
        `/posts/${postId}/comments`,
      );
      setComments(res.items);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open && !loaded) {
      void load();
    }
  }, [open, loaded, load]);

  async function confirmDeleteComment() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const updated = await apiFetch<{
        id: string;
        content: string;
        imageUrl: string | null;
        videoUrl: string | null;
        deletedAt: string | null;
        createdAt: string;
        author: PublicUser;
        replies?: CommentItem["replies"];
      }>(`/posts/${postId}/comments/${deleteTarget}`, { method: "DELETE" });

      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === updated.id) {
            return { ...comment, ...updated, replies: comment.replies };
          }
          return {
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === updated.id ? { ...reply, ...updated } : reply,
            ),
          };
        }),
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <CommentComposer
        postId={postId}
        autoFocus
        onPosted={() => {
          void load();
          onCommentCountChange?.(1);
        }}
      />

      <div className="mt-4 space-y-4">
        {loading ? (
          <p className="text-sm text-muted">Loading replies…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted">No replies yet. Start the thread.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <CommentBubble
                comment={comment}
                viewerId={user?.id}
                onDeleteRequest={setDeleteTarget}
              />
              {comment.replies.map((reply) => (
                <div key={reply.id} className="ml-8">
                  <CommentBubble
                    comment={reply}
                    viewerId={user?.id}
                    onDeleteRequest={setDeleteTarget}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this reply?"
        description="It will show as deleted for everyone. You can only delete your own replies within 24 hours."
        confirmLabel="Delete reply"
        busy={deleting}
        onConfirm={() => void confirmDeleteComment()}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function CommentBubble({
  comment,
  viewerId,
  onDeleteRequest,
}: {
  comment: {
    id: string;
    content: string;
    imageUrl: string | null;
    videoUrl: string | null;
    deletedAt: string | null;
    createdAt: string;
    author: PublicUser;
  };
  viewerId?: string;
  onDeleteRequest: (commentId: string) => void;
}) {
  const deleted = Boolean(comment.deletedAt);
  const deletable =
    viewerId === comment.author.id &&
    canDeleteContent(comment.createdAt, comment.deletedAt);

  return (
    <div className="group flex gap-3">
      <UserAvatar
        displayName={comment.author.displayName}
        avatarUrl={comment.author.avatarUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <Link
            href={`/profile/${comment.author.username}`}
            className="text-sm font-medium hover:underline"
          >
            {comment.author.displayName}
          </Link>
          <span className="text-xs text-muted">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {deletable ? (
            <button
              type="button"
              onClick={() => onDeleteRequest(comment.id)}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          ) : null}
        </div>
        <div
          className={`mt-1 rounded-xl border border-border px-3 py-2 ${
            deleted
              ? "bg-surface/80 italic text-muted"
              : "bg-surface-elevated/70"
          }`}
        >
          {deleted ? (
            <p className="text-sm">{DELETED_COMMENT_LABEL}</p>
          ) : (
            <MediaContent
              content={comment.content}
              imageUrl={comment.imageUrl}
              videoUrl={comment.videoUrl}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}
