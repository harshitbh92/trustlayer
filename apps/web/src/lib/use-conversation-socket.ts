"use client";

import { useCallback, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE, currentAccessToken } from "@/lib/api";
import type { PublicUser } from "@trustlayer/shared";
import type { ChatSendPayload } from "@/components/chat-composer";

export interface ChatMessage {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
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
    fromMe: message.sender.id === viewerId,
  };
}

interface UseConversationSocketOptions {
  conversationId: string;
  onHistory: (messages: ChatMessage[]) => void;
  onMessage: (message: ChatMessage) => void;
  onMessageDeleted?: (message: DeletedMessagePayload) => void;
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
  onError,
}: UseConversationSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onHistoryRef = useRef(onHistory);
  const onMessageRef = useRef(onMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onErrorRef = useRef(onError);

  onHistoryRef.current = onHistory;
  onMessageRef.current = onMessage;
  onMessageDeletedRef.current = onMessageDeleted;
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
    });
  }, [conversationId]);

  const deleteMessage = useCallback((messageId: string) => {
    socketRef.current?.emit("delete-message", { conversationId, messageId });
  }, [conversationId]);

  return { sendMessage, deleteMessage };
}
