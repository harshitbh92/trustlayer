"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Heart, MessageSquare, Share2, Trash2, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TrustBadge } from "@/components/trust-badge";
import { TagList } from "@/components/tag-list";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MediaContent } from "@/components/media-content";
import { PostCommentThread } from "@/components/post-comment-thread";
import { MessageButton } from "@/components/message-button";
import { SharePostModal } from "@/components/share-post-modal";
import { formatRelativeTime } from "@/lib/format-time";
import {
  canDeleteContent,
  DELETED_POST_LABEL,
  PostVisibility,
  ViewerConnectionStatus,
  type PostVisibility as PostVisibilityType,
  type PublicUser,
} from "@trustlayer/shared";

export interface FeedPost {
  id: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  visibility: PostVisibilityType;
  deletedAt: string | null;
  createdAt: string;
  author: PublicUser;
  authorConnectionStatus: ViewerConnectionStatus;
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
}

export function PostCard({
  post,
  viewerId,
  onLike,
  onPostUpdated,
}: {
  post: FeedPost;
  viewerId?: string;
  onLike: () => void;
  onPostUpdated?: (post: FeedPost) => void;
}) {
  const [threadOpen, setThreadOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = viewerId === post.author.id;
  const deleted = Boolean(post.deletedAt);
  const canDeletePost =
    isAuthor && canDeleteContent(post.createdAt, post.deletedAt);
  const canMessage =
    !isAuthor &&
    !deleted &&
    post.authorConnectionStatus === ViewerConnectionStatus.CONNECTED;
  const connectionsOnly = post.visibility === PostVisibility.CONNECTIONS;

  async function confirmDeletePost() {
    setDeleting(true);
    try {
      const updated = await apiFetch<FeedPost>(`/posts/${post.id}`, {
        method: "DELETE",
      });
      onPostUpdated?.(updated);
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="surface-elevated overflow-hidden">
      <div className="p-4 sm:p-5">
        <header className="flex items-start gap-3">
          <Link href={`/profile/${post.author.username}`}>
            <UserAvatar
              displayName={post.author.displayName}
              avatarUrl={post.author.avatarUrl}
              size="md"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  href={`/profile/${post.author.username}`}
                  className="font-semibold hover:underline"
                >
                  {post.author.displayName}
                </Link>
                <p className="text-xs text-muted">
                  @{post.author.username} · {formatRelativeTime(post.createdAt)}
                  {connectionsOnly ? (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-muted">
                      · <Users className="inline h-3 w-3" /> Connections
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canDeletePost ? (
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-surface hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                ) : null}
                <TrustBadge
                  tier={post.author.trustTier}
                  band={post.author.trustBand}
                />
              </div>
            </div>
          </div>
        </header>

        {deleted ? (
          <p className="mt-4 text-sm italic text-muted">{DELETED_POST_LABEL}</p>
        ) : (
          <MediaContent
            content={post.content}
            imageUrl={post.imageUrl}
            videoUrl={post.videoUrl}
            className="mt-4"
          />
        )}

        {!deleted && post.author.tags.length ? (
          <div className="mt-3">
            <TagList tags={post.author.tags.slice(0, 4)} />
          </div>
        ) : null}

        <footer className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
          <button
            type="button"
            onClick={onLike}
            disabled={deleted}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition hover:bg-surface disabled:opacity-50",
              post.likedByViewer ? "text-accent" : "text-muted",
            )}
          >
            <Heart
              className={clsx("h-4 w-4", post.likedByViewer && "fill-current")}
            />
            {post.likeCount}
          </button>

          <button
            type="button"
            onClick={() => setThreadOpen((v) => !v)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition hover:bg-surface",
              threadOpen ? "text-accent" : "text-muted",
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Comment
            {commentCount > 0 ? (
              <span className="rounded-full bg-track px-1.5 text-xs">
                {commentCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={deleted}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-surface disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>

          {canMessage && (
            <MessageButton
              username={post.author.username}
              className="btn-ghost ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
              label="Message"
            />
          )}
        </footer>

        <PostCommentThread
          postId={post.id}
          open={threadOpen}
          onCommentCountChange={(delta) =>
            setCommentCount((c) => Math.max(0, c + delta))
          }
        />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this post?"
        description="It will show as deleted for everyone. You can only delete your own posts within 24 hours."
        confirmLabel="Delete post"
        busy={deleting}
        onConfirm={() => void confirmDeletePost()}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
      />

      <SharePostModal
        post={post}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </article>
  );
}
