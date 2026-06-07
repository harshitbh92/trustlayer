"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { startConversation } from "@/lib/messages";
import { useMessagesPanel } from "@/lib/messages-panel-context";

export function MessageButton({
  username,
  className = "btn-primary text-sm",
  label = "Message",
}: {
  username: string;
  className?: string;
  label?: string;
}) {
  const { openConversation } = useMessagesPanel();
  const [busy, setBusy] = useState(false);

  async function openChat() {
    setBusy(true);
    try {
      const conv = await startConversation(username);
      openConversation(conv.id);
    } catch {
      // Keep user on page if conversation cannot be opened.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openChat}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      {busy ? "Opening…" : label}
    </button>
  );
}
