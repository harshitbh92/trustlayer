"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ChatComposer } from "@/components/chat-composer";
import { ChatMessageList } from "@/components/chat-message-list";
import { MediaLightbox } from "@/components/media-lightbox";
import { UserAvatar } from "@/components/user-avatar";
import { extractMediaFromMessages } from "@/lib/chat-message-utils";
import {
  useConversationSocket,
  withMessageViewerContext,
  type ChatMessage,
  type DeletedMessagePayload,
  type MessageReplyPreview,
  type MessageReactionsPayload,
} from "@/lib/use-conversation-socket";
import type { MessageReactionEmoji, PublicUser } from "@trustlayer/shared";

interface ConversationDetail {
  id: string;
  otherUser: PublicUser | null;
}

function toReplyPreview(message: ChatMessage): MessageReplyPreview {
  return {
    id: message.id,
    content: message.content,
    mediaUrl: message.mediaUrl,
    mediaType: message.mediaType,
    deletedAt: message.deletedAt,
    sender: message.sender,
  };
}

export function ConversationView({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetail | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<MessageReplyPreview | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(false);
    setReplyTo(null);

    Promise.all([
      apiFetch<ConversationDetail>(`/conversations/${conversationId}`),
      apiFetch<{ items: ChatMessage[] }>(
        `/conversations/${conversationId}/messages`,
      ),
    ])
      .then(([conv, history]) => {
        setConversation(conv);
        setMessages(
          history.items.map((message) =>
            withMessageViewerContext(message, user.id),
          ),
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [conversationId, user]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const onHistory = useCallback(
    (history: ChatMessage[]) => {
      if (!user) return;
      setMessages(
        history.map((message) => withMessageViewerContext(message, user.id)),
      );
      scrollToBottom();
    },
    [scrollToBottom, user],
  );

  const onMessage = useCallback(
    (message: ChatMessage) => {
      if (!user) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, withMessageViewerContext(message, user.id)];
      });
      scrollToBottom();
    },
    [scrollToBottom, user],
  );

  const onMessageDeleted = useCallback(
    (payload: DeletedMessagePayload) => {
      if (!user) return;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === payload.id
            ? withMessageViewerContext(
                {
                  ...message,
                  content: "",
                  mediaUrl: null,
                  mediaType: null,
                  deletedAt: payload.deletedAt,
                },
                user.id,
              )
            : message,
        ),
      );
    },
    [user],
  );

  const onMessageReactions = useCallback((payload: MessageReactionsPayload) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === payload.messageId
          ? { ...message, reactions: payload.reactions }
          : message,
      ),
    );
  }, []);

  const onTyping = useCallback(
    (payload: { userId: string; isTyping: boolean }) => {
      if (!user || payload.userId === user.id) return;
      setOtherUserTyping(payload.isTyping);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (payload.isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setOtherUserTyping(false);
        }, 4000);
      }
    },
    [user],
  );

  const { sendMessage, deleteMessage, reactToMessage, emitTyping } =
    useConversationSocket({
      conversationId,
      onHistory,
      onMessage,
      onMessageDeleted,
      onMessageReactions,
      onTyping,
    });

  const mediaGallery = extractMediaFromMessages(messages);
  const mediaMessageIds = messages
    .filter(
      (m) =>
        !m.deletedAt &&
        m.mediaUrl &&
        (m.mediaType === "image" || m.mediaType === "video"),
    )
    .map((m) => m.id);

  const openMedia = useCallback((messageId: string) => {
    const index = mediaMessageIds.indexOf(messageId);
    if (index >= 0) setLightboxIndex(index);
  }, [mediaMessageIds]);

  const handleReply = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message || message.deletedAt) return;
      setReplyTo(toReplyPreview(message));
    },
    [messages],
  );

  const handleReact = useCallback(
    (messageId: string, emoji: MessageReactionEmoji) => {
      reactToMessage(messageId, emoji);
    },
    [reactToMessage],
  );

  const handleCopy = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      const text = message?.content?.trim();
      if (!text) return;
      void navigator.clipboard.writeText(text);
    },
    [messages],
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  if (loading) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        Loading conversation…
      </p>
    );
  }

  if (error || !conversation?.otherUser) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        Could not load this conversation.
      </p>
    );
  }

  const other = conversation.otherUser;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <UserAvatar
          displayName={other.displayName}
          avatarUrl={other.avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{other.displayName}</p>
          {otherUserTyping ? (
            <p className="text-xs text-accent">typing…</p>
          ) : (
            <p className="text-xs text-muted">@{other.username}</p>
          )}
        </div>
        <Link
          href={`/profile/${other.username}`}
          className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
        >
          Profile
        </Link>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted">
            Say hello — this is the start of your conversation.
          </p>
        ) : (
          <ChatMessageList
            messages={messages}
            onDeleteRequest={setDeleteTarget}
            onMediaOpen={openMedia}
            onReply={handleReply}
            onReact={handleReact}
            onCopy={handleCopy}
          />
        )}
      </div>

      <div className="border-t border-border p-4">
        <ChatComposer
          onSend={sendMessage}
          onTyping={emitTyping}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>

      <MediaLightbox
        open={lightboxIndex !== null}
        media={
          lightboxIndex !== null ? mediaGallery[lightboxIndex] ?? null : null
        }
        index={lightboxIndex ?? 0}
        total={mediaGallery.length}
        onClose={() => setLightboxIndex(null)}
        onPrev={
          lightboxIndex !== null && lightboxIndex > 0
            ? () => setLightboxIndex((i) => (i !== null ? i - 1 : null))
            : undefined
        }
        onNext={
          lightboxIndex !== null && lightboxIndex < mediaGallery.length - 1
            ? () => setLightboxIndex((i) => (i !== null ? i + 1 : null))
            : undefined
        }
        onReact={handleReact}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this message?"
        description="It will show as deleted for everyone. You can only delete your own messages within 24 hours."
        confirmLabel="Delete message"
        onConfirm={() => {
          if (deleteTarget) deleteMessage(deleteTarget);
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
