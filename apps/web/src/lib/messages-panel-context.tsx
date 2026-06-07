"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface MessagesPanelContextValue {
  isOpen: boolean;
  conversationId: string | null;
  openInbox: () => void;
  openConversation: (id: string) => void;
  close: () => void;
  backToInbox: () => void;
}

const MessagesPanelContext = createContext<MessagesPanelContextValue | null>(
  null,
);

export function MessagesPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const openInbox = useCallback(() => {
    setConversationId(null);
    setIsOpen(true);
  }, []);

  const openConversation = useCallback((id: string) => {
    setConversationId(id);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setConversationId(null);
  }, []);

  const backToInbox = useCallback(() => {
    setConversationId(null);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      conversationId,
      openInbox,
      openConversation,
      close,
      backToInbox,
    }),
    [isOpen, conversationId, openInbox, openConversation, close, backToInbox],
  );

  return (
    <MessagesPanelContext.Provider value={value}>
      {children}
    </MessagesPanelContext.Provider>
  );
}

export function useMessagesPanel() {
  const ctx = useContext(MessagesPanelContext);
  if (!ctx) {
    throw new Error("useMessagesPanel must be used within MessagesPanelProvider");
  }
  return ctx;
}
