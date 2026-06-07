"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀", "😂", "🥹", "😍", "😘", "😎", "🤔", "😅", "🙌", "👏", "🔥", "✨",
      "❤️", "💯", "🎉", "👍", "👎", "🙏", "💪", "😭", "😡", "🤝", "👀", "💬",
    ],
  },
  {
    label: "Gestures",
    emojis: ["👋", "🤞", "✌️", "🫶", "🤗", "🫡", "👊", "✊", "🤷", "🙋", "💁", "🙆"],
  },
  {
    label: "Objects",
    emojis: ["📷", "🎥", "🎬", "📱", "💻", "🎵", "☕", "🍕", "⚽", "🏆", "📌", "🔗"],
  },
];

export function EmojiPickerPopover({
  open,
  onSelect,
  onClose,
  className,
}: {
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={clsx(
        "absolute bottom-full left-0 z-50 mb-2 w-72 rounded-2xl border border-border bg-surface-elevated p-3 shadow-xl",
        className,
      )}
    >
      <div className="max-h-56 space-y-3 overflow-y-auto">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="rounded-lg p-1 text-lg transition hover:bg-surface"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
