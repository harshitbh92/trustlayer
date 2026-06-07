"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FeedComposer } from "@/components/feed-composer";
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

  const load = useCallback(
    async (reset = false) => {
      const c = reset ? null : cursor;
      const qs = c ? `?cursor=${encodeURIComponent(c)}` : "";
      const res = await apiFetch<FeedResponse>(`/posts/feed${qs}`);
      setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
      setLoading(false);
    },
    [cursor],
  );

  useEffect(() => {
    if (signedIn) load(true);
  }, [signedIn, load]);

  async function publish(payload: {
    content: string;
    imageUrl?: string;
    videoUrl?: string;
  }) {
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
          Posts from the community — reply in public threads or message
          connections privately.
        </p>
      </header>

      <FeedComposer onPublish={publish} busy={busy} />

      <div className="space-y-4">
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
                  prev.map((post) => (post.id === updated.id ? updated : post)),
                )
              }
            />
          ))
        )}

        {cursor ? (
          <div className="text-center">
            <button onClick={() => load()} className="btn-ghost">
              Load more
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
