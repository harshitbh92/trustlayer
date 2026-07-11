import Link from "next/link";
import type { PublicUser } from "@trustlayer/shared";
import { TrustBadge } from "./trust-badge";
import { TagList } from "./tag-list";

export function ProfileCard({
  user,
  action,
  emphasizePersonalityType = false,
}: {
  user: PublicUser;
  action?: React.ReactNode;
  emphasizePersonalityType?: boolean;
}) {
  return (
    <div className="surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/profile/${user.username}`}
            className="text-base font-semibold hover:underline"
          >
            {user.displayName}
          </Link>
          <p className="text-xs text-muted">@{user.username}</p>
        </div>
        <TrustBadge tier={user.trustTier} band={user.trustBand} />
      </div>

      {emphasizePersonalityType && user.personalityType ? (
        <div className="mt-4">
          <p className="label">Personality type</p>
          <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            {user.personalityType}
          </p>
          {user.personalitySubType ? (
            <p className="mt-1 text-sm font-medium text-accent">
              {user.personalitySubType}
            </p>
          ) : null}
          {user.personalityScore != null ? (
            <p className="mt-2 text-sm text-muted">
              Personality score: {Math.round(user.personalityScore)} / 100
            </p>
          ) : null}
        </div>
      ) : user.personalityType ? (
        <p className="mt-2 text-sm font-medium text-accent">
          {user.personalityType}
          {user.personalitySubType ? ` · ${user.personalitySubType}` : ""}
        </p>
      ) : null}

      {user.bio ? (
        <p className="mt-3 text-sm text-muted/90">{user.bio}</p>
      ) : null}
      {(user.communicationStyle || user.socialEnergy) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          {user.communicationStyle ? (
            <span>{user.communicationStyle}</span>
          ) : null}
          {user.communicationStyle && user.socialEnergy ? (
            <span>·</span>
          ) : null}
          {user.socialEnergy ? <span>{user.socialEnergy}</span> : null}
        </div>
      )}
      <div className="mt-3">
        <TagList tags={user.tags.slice(0, 6)} />
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
