import clsx from "clsx";
import { User } from "lucide-react";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserAvatar({
  displayName,
  avatarUrl,
  size = "md",
  className,
}: {
  displayName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-accent/30 to-accent-deep/40 ring-1 ring-border",
        sizes[size],
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-accent/15 font-semibold text-accent">
          {initials(displayName) || (
            <User className="h-4 w-4" strokeWidth={1.5} />
          )}
        </div>
      )}
    </div>
  );
}
