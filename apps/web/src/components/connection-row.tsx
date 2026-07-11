"use client";

import Link from "next/link";
import { Check, UserMinus, X } from "lucide-react";
import { MessageButton } from "@/components/message-button";
import { TrustBadge } from "@/components/trust-badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatLocation, type PublicUser } from "@trustlayer/shared";

export function matchesConnectionQuery(user: PublicUser, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  const location = formatLocation(user.city, user.country)?.toLowerCase() ?? "";
  return (
    user.displayName.toLowerCase().includes(q) ||
    user.username.toLowerCase().includes(q) ||
    (user.personalityType?.toLowerCase().includes(q) ?? false) ||
    (user.personalitySubType?.toLowerCase().includes(q) ?? false) ||
    location.includes(q)
  );
}

function personMeta(user: PublicUser) {
  const parts = [
    user.personalityType,
    formatLocation(user.city, user.country),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "No personality set yet";
}

export function ConnectionPersonRow({
  user,
  subtitle,
  badge,
  actions,
  accent = "none",
}: {
  user: PublicUser;
  subtitle?: string;
  badge?: React.ReactNode;
  actions: React.ReactNode;
  accent?: "request" | "pending" | "none";
}) {
  return (
    <li
      className={`flex h-full min-h-[5.75rem] items-center gap-3 rounded-xl border bg-surface-elevated/50 px-4 py-3 ${
        accent === "request"
          ? "border-border border-l-4 border-l-accent"
          : accent === "pending"
            ? "border-dashed border-border"
            : "border-border"
      }`}
    >
      <Link href={`/profile/${user.username}`} className="shrink-0">
        <UserAvatar
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          size="lg"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/profile/${user.username}`}
            className="truncate font-semibold hover:underline"
          >
            {user.displayName}
          </Link>
          {badge}
        </div>
        <p className="truncate text-xs text-muted">@{user.username}</p>
        <p className="mt-1 line-clamp-1 text-xs text-muted">
          {subtitle ?? personMeta(user)}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {actions}
      </div>
    </li>
  );
}

export function IncomingRequestRow({
  user,
  createdAt,
  onAccept,
  onDecline,
  busy,
}: {
  user: PublicUser;
  createdAt: string;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
}) {
  const when = new Date(createdAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <ConnectionPersonRow
      user={user}
      accent="request"
      badge={
        <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          New
        </span>
      }
      subtitle={`Requested ${when}${user.personalityType ? ` · ${user.personalityType}` : ""}`}
      actions={
        <>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={busy}
            className="btn-ghost inline-flex items-center gap-1 px-3 py-1.5 text-xs"
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </button>
        </>
      }
    />
  );
}

export function ConnectedPersonRow({
  user,
  onDisconnect,
  busy,
}: {
  user: PublicUser;
  onDisconnect: () => void;
  busy?: boolean;
}) {
  return (
    <ConnectionPersonRow
      user={user}
      accent="none"
      badge={<TrustBadge tier={user.trustTier} band={user.trustBand} />}
      actions={
        <>
          <MessageButton
            username={user.username}
            className="btn-primary px-3 py-1.5 text-xs"
          />
          <Link
            href={`/profile/${user.username}`}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={onDisconnect}
            disabled={busy}
            className="btn-ghost inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted hover:text-rose-500"
            aria-label={`Disconnect from ${user.displayName}`}
          >
            <UserMinus className="h-3.5 w-3.5" />
          </button>
        </>
      }
    />
  );
}

export function OutgoingRequestRow({
  user,
  onCancel,
  busy,
}: {
  user: PublicUser;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <ConnectionPersonRow
      user={user}
      accent="pending"
      badge={
        <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          Sent
        </span>
      }
      subtitle={
        user.personalityType
          ? `Pending · ${user.personalityType}`
          : "Waiting for a response"
      }
      actions={
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="btn-ghost px-3 py-1.5 text-xs"
        >
          Cancel
        </button>
      }
    />
  );
}
