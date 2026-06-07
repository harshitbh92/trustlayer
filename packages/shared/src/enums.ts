export const DiscoverLayout = {
  GRID: "GRID",
  DATING_STACK: "DATING_STACK",
  SWIPE: "SWIPE",
} as const;
export type DiscoverLayout =
  (typeof DiscoverLayout)[keyof typeof DiscoverLayout];

export const DISCOVER_LAYOUT_LABELS: Record<DiscoverLayout, string> = {
  GRID: "Classic grid",
  DATING_STACK: "Dating stack",
  SWIPE: "Swipe cards",
};

export const UserRole = {
  GUEST: "GUEST",
  STANDARD: "STANDARD",
  VERIFIED: "VERIFIED",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TrustTier = {
  NEW: "NEW",
  VERIFIED_PRESENCE: "VERIFIED_PRESENCE",
  TRUSTED_COMMUNICATOR: "TRUSTED_COMMUNICATOR",
  COMMUNITY_FAVORITE: "COMMUNITY_FAVORITE",
  ELITE_CONVERSATIONALIST: "ELITE_CONVERSATIONALIST",
} as const;
export type TrustTier = (typeof TrustTier)[keyof typeof TrustTier];

export const ConnectionStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
} as const;
export type ConnectionStatus =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

/** Viewer-relative connection state for Discover / profile UI */
export const ViewerConnectionStatus = {
  NONE: "NONE",
  REQUESTED: "REQUESTED",
  INCOMING: "INCOMING",
  CONNECTED: "CONNECTED",
} as const;
export type ViewerConnectionStatus =
  (typeof ViewerConnectionStatus)[keyof typeof ViewerConnectionStatus];

export const AnonymousSessionStatus = {
  WAITING: "WAITING",
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const;
export type AnonymousSessionStatus =
  (typeof AnonymousSessionStatus)[keyof typeof AnonymousSessionStatus];

export const TagCategory = {
  TRUST: "trust",
  SOCIAL: "social",
  INTELLECTUAL: "intellectual",
  FUN: "fun",
  EMOTIONAL: "emotional",
  STYLE: "style",
} as const;
export type TagCategory = (typeof TagCategory)[keyof typeof TagCategory];

export const TRUST_TIER_LABELS: Record<TrustTier, string> = {
  NEW: "New",
  VERIFIED_PRESENCE: "Verified Presence",
  TRUSTED_COMMUNICATOR: "Trusted Communicator",
  COMMUNITY_FAVORITE: "Community Favorite",
  ELITE_CONVERSATIONALIST: "Elite Conversationalist",
};

export const TRUST_BANDS = {
  BUILDING: "Building",
  GROWING: "Growing trust",
  STRONG: "Strong positive signals",
} as const;
export type TrustBand = (typeof TRUST_BANDS)[keyof typeof TRUST_BANDS];

export const ReportStatus = {
  OPEN: "OPEN",
  REVIEWED: "REVIEWED",
  ACTIONED: "ACTIONED",
  DISMISSED: "DISMISSED",
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const ModerationActionType = {
  WARN: "WARN",
  SHADOWBAN: "SHADOWBAN",
  SUSPEND: "SUSPEND",
  BAN: "BAN",
} as const;
export type ModerationActionType =
  (typeof ModerationActionType)[keyof typeof ModerationActionType];
