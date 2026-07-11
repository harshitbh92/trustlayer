"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { Copy, Reply, Trash2 } from "lucide-react";
import {
  MESSAGE_REACTION_EMOJIS,
  type MessageReactionEmoji,
} from "@trustlayer/shared";

export interface MessageContextMenuState {
  messageId: string;
  x: number;
  y: number;
  canCopy: boolean;
  canDelete: boolean;
}

export function MessageContextMenu({
  menu,
  onClose,
  onReply,
  onReact,
  onCopy,
  onDelete,
}: {
  menu: MessageContextMenuState | null;
  onClose: () => void;
  onReply: (messageId: string) => void;
  onReact: (messageId: string, emoji: MessageReactionEmoji) => void;
  onCopy: (messageId: string) => void;
  onDelete: (messageId: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const width = 240;
  const height = 200;
  const left = Math.min(Math.max(menu.x, 8), window.innerWidth - width - 8);
  const top = Math.min(Math.max(menu.y, 8), window.innerHeight - height - 8);

  return (
    <div
      ref={ref}
      className="fixed z-[110] w-60 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      style={{ left, top }}
      role="menu"
    >
      <div className="flex items-center justify-between gap-1 border-b border-border px-2 py-2">
        {MESSAGE_REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="menuitem"
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:bg-surface-elevated"
            onClick={() => {
              onReact(menu.messageId, emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="py-1">
        <MenuButton
          icon={Reply}
          label="Reply"
          onClick={() => {
            onReply(menu.messageId);
            onClose();
          }}
        />
        {menu.canCopy ? (
          <MenuButton
            icon={Copy}
            label="Copy text"
            onClick={() => {
              onCopy(menu.messageId);
              onClose();
            }}
          />
        ) : null}
        {menu.canDelete ? (
          <MenuButton
            icon={Trash2}
            label="Delete"
            destructive
            onClick={() => {
              onDelete(menu.messageId);
              onClose();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Reply;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-surface-elevated",
        destructive ? "text-rose-500" : "text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
     </button>
  );
}

export function useLongPress(
  onLongPress: (event: React.MouseEvent | React.TouchEvent) => void,
  delayMs = 500,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    onTouchStart: (event: React.TouchEvent) => {
      clearTimer();
      timerRef.current = setTimeout(() => onLongPress(event), delayMs);
    },
    onTouchEnd: clearTimer,
    onTouchMove: clearTimer,
    onMouseDown: (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      clearTimer();
      timerRef.current = setTimeout(() => onLongPress(event), delayMs);
    },
    onMouseUp: clearTimer,
    onMouseLeave: clearTimer,
  };
}
