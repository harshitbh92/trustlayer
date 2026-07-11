export const CONTENT_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MESSAGE_DELETE_WINDOW_MS = CONTENT_DELETE_WINDOW_MS;

export const DELETED_MESSAGE_LABEL = "This message was deleted";
export const DELETED_POST_LABEL = "This post was deleted";
export const DELETED_COMMENT_LABEL = "This message was deleted";

export function canDeleteContent(createdAt: string, deletedAt?: string | null) {
  if (deletedAt) return false;
  return Date.now() - new Date(createdAt).getTime() <= CONTENT_DELETE_WINDOW_MS;
}

export function canDeleteMessage(createdAt: string, deletedAt?: string | null) {
  return canDeleteContent(createdAt, deletedAt);
}

export const MESSAGE_REACTION_EMOJIS = [
  "❤️",
  "😂",
  "👍",
  "😮",
  "😢",
  "🔥",
] as const;

export type MessageReactionEmoji = (typeof MESSAGE_REACTION_EMOJIS)[number];

export function isMessageReactionEmoji(
  value: string,
): value is MessageReactionEmoji {
  return (MESSAGE_REACTION_EMOJIS as readonly string[]).includes(value);
}
