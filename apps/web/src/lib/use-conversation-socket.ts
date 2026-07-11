"use client";

import { useCallback, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE, currentAccessToken } from "@/lib/api";
import type { MessageReactionEmoji, PublicUser } from "@trustlayer/shared";
import type { ChatSendPayload } from "@/components/chat-composer";

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface MessageReplyPreview {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  deletedAt?: string | null;
  sender: PublicUser;
}

export interface ChatMessage {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  replyTo?: MessageReplyPreview | null;
  reactions?: MessageReactionSummary[];
  deletedAt?: string | null;
  createdAt: string;
  sender: PublicUser;
  fromMe: boolean;
}

export function withMessageViewerContext(
  message: Omit<ChatMessage, "fromMe"> & { fromMe?: boolean },
  viewerId: string,
): ChatMessage {
  return {
    ...message,
    reactions: message.reactions ?? [],
    replyTo: message.replyTo ?? null,
    fromMe: message.sender.id === viewerId,
  };
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface MessageReactionsPayload {
  messageId: string;
  conversationId: string;
  reactions: MessageReactionSummary[];
}

interface UseConversationSocketOptions {
  conversationId: string;
  onHistory: (messages: ChatMessage[]) => void;
  onMessage: (message: ChatMessage) => void;
  onMessageDeleted?: (message: DeletedMessagePayload) => void;
  onMessageReactions?: (payload: MessageReactionsPayload) => void;
  onTyping?: (payload: TypingPayload) => void;
  onError?: (message: string) => void;
}

export interface DeletedMessagePayload {
  id: string;
  conversationId: string;
  content: string;
  mediaUrl: null;
  mediaType: null;
  deletedAt: string;
  createdAt: string;
  sender: PublicUser;
}

export function useConversationSocket({
  conversationId,
  onHistory,
  onMessage,
  onMessageDeleted,
  onMessageReactions,
  onTyping,
  onError,
}: UseConversationSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onHistoryRef = useRef(onHistory);
  const onMessageRef = useRef(onMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onMessageReactionsRef = useRef(onMessageReactions);
  const onTypingRef = useRef(onTyping);
  const onErrorRef = useRef(onError);

  onHistoryRef.current = onHistory;
  onMessageRef.current = onMessage;
  onMessageDeletedRef.current = onMessageDeleted;
  onMessageReactionsRef.current = onMessageReactions;
  onTypingRef.current = onTyping;
  onErrorRef.current = onError;

  const joinRoom = useCallback((socket: Socket, id: string) => {
    socket.emit("join-conversation", { conversationId: id });
  }, []);

  useEffect(() => {
    const token = currentAccessToken();
    if (!token || !conversationId) return;

    const socket = io(`${API_BASE}/messages`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => joinRoom(socket, conversationId));

    socket.on(
      "conversation-joined",
      (payload: { conversationId: string; messages: ChatMessage[] }) => {
        if (payload.conversationId !== conversationId) return;
        onHistoryRef.current(payload.messages);
      },
    );

    socket.on("new-message", (message: ChatMessage) => {
      if (message && "conversationId" in message) {
        const m = message as ChatMessage & { conversationId?: string };
        if (m.conversationId && m.conversationId !== conversationId) return;
      }
      onMessageRef.current(message);
    });

    socket.on("message-deleted", (payload: DeletedMessagePayload) => {
      if (payload.conversationId !== conversationId) return;
      onMessageDeletedRef.current?.(payload);
    });

    socket.on("message-reactions", (payload: MessageReactionsPayload) => {
      if (payload.conversationId !== conversationId) return;
      onMessageReactionsRef.current?.(payload);
    });

    socket.on("typing", (payload: TypingPayload) => {
      if (payload.conversationId !== conversationId) return;
      onTypingRef.current?.(payload);
    });

    socket.on("error-message", (message: string) => {
      onErrorRef.current?.(message);
    });

    if (socket.connected) {
      joinRoom(socket, conversationId);
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, joinRoom]);

  const sendMessage = useCallback((payload: ChatSendPayload) => {
    socketRef.current?.emit("send-message", {
      conversationId,
      content: payload.content,
      mediaUrl: payload.mediaUrl,
      mediaType: payload.mediaType,
      replyToId: payload.replyToId,
    });
  }, [conversationId]);

  const deleteMessage = useCallback((messageId: string) => {
    socketRef.current?.emit("delete-message", { conversationId, messageId });
  }, [conversationId]);

  const reactToMessage = useCallback(
    (messageId: string, emoji: MessageReactionEmoji) => {
      socketRef.current?.emit("react-message", {
        conversationId,
        messageId,
        emoji,
      });
    },
    [conversationId],
  );

  const emitTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.emit("typing", { conversationId, isTyping });
  }, [conversationId]);

  return { sendMessage, deleteMessage, reactToMessage, emitTyping };
}
