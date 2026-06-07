"use client";

import Link from "next/link";
import clsx from "clsx";
import { Heart, MapPin, Sparkles } from "lucide-react";
import { TrustBadge } from "@/components/trust-badge";
import { TagList } from "@/components/tag-list";
import { formatLocation, type DiscoverUser } from "@trustlayer/shared";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DiscoverDatingCard({
  user,
  className,
}: {
  user: DiscoverUser;
  className?: string;
}) {
  const location = formatLocation(user.city, user.country);

  return (
    <article
      className={clsx(
        "flex max-h-[min(78vh,720px)] flex-col overflow-hidden rounded-3xl border border-rose-100/80 bg-white shadow-xl shadow-rose-200/40 dark:border-rose-900/30 dark:bg-surface-elevated dark:shadow-black/30",
        className,
      )}
    >
      <div className="relative aspect-[4/5] max-h-[42vh] shrink-0 overflow-hidden bg-gradient-to-br from-rose-200 via-pink-100 to-violet-200 dark:from-rose-950 dark:via-pink-950 dark:to-violet-950">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-rose-700/70 dark:text-rose-200/80">
            {initials(user.displayName)}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-4 pt-16">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                {user.displayName}
                {user.age != null ? (
                  <span className="ml-2 text-xl font-normal text-white/90">
                    {user.age}
                  </span>
                ) : null}
              </h2>
              {location ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-white/85">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </p>
              ) : null}
            </div>
            <TrustBadge tier={user.trustTier} band={user.trustBand} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {user.personalityType ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/30">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-rose-600 dark:text-rose-300">
              <Sparkles className="h-3.5 w-3.5" />
              Personality type
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-rose-950 dark:text-rose-50">
              {user.personalityType}
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-xs text-muted">@{user.username}</p>
          {(user.communicationStyle || user.socialEnergy) && (
            <p className="mt-1 text-sm text-muted">
              {[user.communicationStyle, user.socialEnergy]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        {user.bio ? (
          <p className="text-sm leading-relaxed text-foreground/90">{user.bio}</p>
        ) : (
          <p className="text-sm italic text-muted">No bio yet.</p>
        )}

        {user.interests.length > 0 ? (
          <div>
            <p className="label mb-2 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-500" />
              Interests
            </p>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="label mb-2">Reputation tags</p>
          <TagList tags={user.tags.slice(0, 8)} empty="No tags yet" />
        </div>

        <Link
          href={`/profile/${user.username}`}
          className="inline-flex text-sm font-medium text-rose-600 hover:underline dark:text-rose-300"
        >
          View full profile
        </Link>
      </div>
    </article>
  );
}
