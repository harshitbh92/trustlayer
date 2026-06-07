import clsx from "clsx";
import { TRUST_TIER_LABELS, type TrustTier } from "@trustlayer/shared";

const TIER_STYLES: Record<TrustTier, string> = {
  NEW: "bg-surface-elevated text-muted border-border",
  VERIFIED_PRESENCE: "bg-accent/10 text-accent border-accent/20",
  TRUSTED_COMMUNICATOR: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  COMMUNITY_FAVORITE: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  ELITE_CONVERSATIONALIST: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/20",
};

export function TrustBadge({
  tier,
  band,
  className,
}: {
  tier: TrustTier;
  band?: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs",
        TIER_STYLES[tier],
        className,
      )}
      title={band}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {TRUST_TIER_LABELS[tier]}
      {band ? <span className="text-muted/80">· {band}</span> : null}
    </span>
  );
}
