"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FeedComposer, type FeedPublishPayload } from "@/components/feed-composer";
import { PostCard, type FeedPost } from "@/components/post-card";

interface FeedResponse {
  items: FeedPost[];
  nextCursor: string | null;
}

export default function FeedPage() {
  const { signedIn, user } = useAuth();
  const [items, setItems] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<FeedResponse>("/posts/feed");
      setItems(res.items);
      setCursor(res.nextCursor);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) void loadInitial();
  }, [signedIn, loadInitial]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const qs = `?cursor=${encodeURIComponent(cursor)}`;
      const res = await apiFetch<FeedResponse>(`/posts/feed${qs}`);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function publish(payload: FeedPublishPayload) {
    setBusy(true);
    try {
      const post = await apiFetch<FeedPost>("/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setItems((prev) => [post, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(item: FeedPost) {
    const liked = !item.likedByViewer;
    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? {
              ...p,
              likedByViewer: liked,
              likeCount: p.likeCount + (liked ? 1 : -1),
            }
          : p,
      ),
    );
    try {
      await apiFetch(`/posts/${item.id}/like`, {
        method: liked ? "POST" : "DELETE",
      });
    } catch {
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                likedByViewer: !liked,
                likeCount: p.likeCount + (liked ? -1 : 1),
              }
            : p,
        ),
      );
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Activity feed</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Feed</h1>
        <p className="mt-1 text-sm text-muted">
          Share publicly or with connections — like, comment, and share posts
          you want others to see.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-[360px]">
          <FeedComposer onPublish={publish} busy={busy} />
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {loading ? (
            <p className="text-sm text-muted">Loading feed…</p>
          ) : items.length === 0 ? (
            <section className="surface-elevated p-8 text-center">
              <p className="text-sm text-muted">
                No posts yet. Be the first to share.
              </p>
            </section>
          ) : (
            items.map((item) => (
              <PostCard
                key={item.id}
                post={item}
                viewerId={user?.id}
                onLike={() => toggleLike(item)}
                onPostUpdated={(updated) =>
                  setItems((prev) =>
                    prev.map((post) =>
                      post.id === updated.id ? updated : post,
                    ),
                  )
                }
              />
            ))
          )}

          {cursor ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="btn-ghost"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
