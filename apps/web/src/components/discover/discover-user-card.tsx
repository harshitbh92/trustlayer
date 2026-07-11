"use client";

import Link from "next/link";
import { MapPin, Sparkles } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";
import { TagList } from "@/components/tag-list";
import { TrustBadge } from "@/components/trust-badge";
import { UserAvatar } from "@/components/user-avatar";
import { toConnectUiStatus } from "@/lib/connections";
import { formatLocation, type DiscoverUser } from "@trustlayer/shared";

export function DiscoverUserCard({
  user,
  onConnect,
  connecting,
}: {
  user: DiscoverUser;
  onConnect: () => void;
  connecting?: boolean;
}) {
  const location = formatLocation(user.city, user.country);
  const styleBits = [user.communicationStyle, user.socialEnergy].filter(Boolean);

  return (
    <article className="surface flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <UserAvatar
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          size="lg"
          className="!h-14 !w-14 !text-base"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/profile/${user.username}`}
                className="block truncate text-base font-semibold hover:underline"
              >
                {user.displayName}
                {user.age != null ? (
                  <span className="ml-1.5 font-normal text-muted">{user.age}</span>
                ) : null}
              </Link>
              <p className="truncate text-xs text-muted">@{user.username}</p>
            </div>
            <TrustBadge tier={user.trustTier} band={user.trustBand} />
          </div>
          {location ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted/70">Location not set</p>
          )}
        </div>
      </div>

      <div className="mt-4 min-h-[4.5rem] rounded-xl border border-border bg-surface-elevated/60 px-3 py-2.5">
        {user.personalityType ? (
          <>
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted">
              <Sparkles className="h-3 w-3" />
              Personality
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">
              {user.personalityType}
            </p>
            <p className="truncate text-xs text-accent">
              {user.personalitySubType || "Subtype pending"}
              {user.personalityScore != null
                ? ` · ${Math.round(user.personalityScore)}/100`
                : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Personality not set yet</p>
        )}
      </div>

      {styleBits.length > 0 ? (
        <p className="mt-3 line-clamp-1 text-xs text-muted">
          {styleBits.join(" · ")}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted/70">Style not set</p>
      )}

      <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-foreground/85">
        {user.bio?.trim() || "No bio yet."}
      </p>

      <div className="mt-3 min-h-[2.25rem]">
        {user.interests.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {user.interests.slice(0, 4).map((interest) => (
              <span
                key={interest}
                className="rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-[11px] text-muted"
              >
                {interest}
              </span>
            ))}
            {user.interests.length > 4 ? (
              <span className="rounded-full px-2 py-0.5 text-[11px] text-muted">
                +{user.interests.length - 4}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted/70">No interests listed</p>
        )}
      </div>

      <div className="mt-3 min-h-[2.5rem]">
        <TagList tags={user.tags.slice(0, 5)} empty="No reputation tags yet" />
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <div className="min-w-0 flex-1">
          <ConnectButton
            status={toConnectUiStatus(user.connectionStatus)}
            onConnect={onConnect}
            busy={connecting}
            className="w-full text-sm"
          />
        </div>
        <Link
          href={`/profile/${user.username}`}
          className="btn-ghost shrink-0 px-3 py-2 text-xs"
        >
          Profile
        </Link>
      </div>
    </article>
  );
}
