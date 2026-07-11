import type { ChatMessage } from "@/lib/use-conversation-socket";
import type { LightboxMedia } from "@/components/media-lightbox";

const GROUP_GAP_MS = 5 * 60 * 1000;

export function formatDateDivider(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export type ChatListEntry =
  | { kind: "date"; label: string; key: string }
  | {
      kind: "message";
      message: ChatMessage;
      showHeader: boolean;
      isGrouped: boolean;
      key: string;
    };

export function buildChatListEntries(messages: ChatMessage[]): ChatListEntry[] {
  const entries: ChatListEntry[] = [];
  let lastDateKey = "";
  let lastSenderId: string | null = null;
  let lastCreatedAt: number | null = null;

  for (const message of messages) {
    const dateKey = new Date(message.createdAt).toDateString();
    if (dateKey !== lastDateKey) {
      entries.push({
        kind: "date",
        label: formatDateDivider(message.createdAt),
        key: `date-${dateKey}`,
      });
      lastDateKey = dateKey;
      lastSenderId = null;
      lastCreatedAt = null;
    }

    const createdAt = new Date(message.createdAt).getTime();
    const sameSender = lastSenderId === message.sender.id;
    const closeInTime =
      lastCreatedAt != null && createdAt - lastCreatedAt < GROUP_GAP_MS;
    const isGrouped = sameSender && closeInTime && !message.deletedAt;
    const showHeader = !isGrouped;

    entries.push({
      kind: "message",
      message,
      showHeader,
      isGrouped,
      key: message.id,
    });

    lastSenderId = message.sender.id;
    lastCreatedAt = createdAt;
  }

  return entries;
}

export function extractMediaFromMessages(
  messages: ChatMessage[],
): LightboxMedia[] {
  return messages
    .filter(
      (m) =>
        !m.deletedAt &&
        m.mediaUrl &&
        (m.mediaType === "image" || m.mediaType === "video"),
    )
    .map((m) => ({
      messageId: m.id,
      url: m.mediaUrl!,
      mediaType: m.mediaType as "image" | "video",
      senderName: m.fromMe ? "You" : m.sender.displayName,
      createdAt: m.createdAt,
      reactions: m.reactions ?? [],
    }));
}
