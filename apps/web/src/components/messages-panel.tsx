"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, X } from "lucide-react";
import { useMessagesPanel } from "@/lib/messages-panel-context";
import { MessagesInbox } from "@/components/messages-inbox";
import { ConversationView } from "@/components/conversation-view";

export function MessagesPanel() {
  const {
    isOpen,
    conversationId,
    close,
    backToInbox,
    openConversation,
  } = useMessagesPanel();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close messages"
        className={clsx(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={close}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={conversationId ? "Conversation" : "Messages"}
        className={clsx(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3">
          {conversationId ? (
            <button
              type="button"
              onClick={backToInbox}
              className="btn-ghost px-2 py-2"
              aria-label="Back to inbox"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Private messages
            </p>
            <h2 className="truncate text-lg font-semibold tracking-tight">
              {conversationId ? "Conversation" : "Messages"}
            </h2>
          </div>

          <button
            type="button"
            onClick={close}
            className="btn-ghost px-2 py-2"
            aria-label="Close messages"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1">
          {conversationId ? (
            <ConversationView conversationId={conversationId} />
          ) : (
            <MessagesInbox onSelectConversation={openConversation} />
          )}
        </div>
      </aside>
    </>
  );
}
