import { TrustTier, TRUST_BANDS, type TrustBand } from "@trustlayer/shared";

export interface TierInputs {
  positiveFeedbackCount: number;
  earnedTagCount: number;
  isVerified: boolean;
}

/**
 * Phase 1 tier promotion. Decay and richer signals come in Phase 2.
 */
export function computeTrustTier(inputs: TierInputs): TrustTier {
  const { positiveFeedbackCount, earnedTagCount, isVerified } = inputs;

  if (positiveFeedbackCount >= 25 && earnedTagCount >= 6) {
    return TrustTier.COMMUNITY_FAVORITE;
  }
  if (positiveFeedbackCount >= 8 && earnedTagCount >= 3) {
    return TrustTier.TRUSTED_COMMUNICATOR;
  }
  if (isVerified) {
    return TrustTier.VERIFIED_PRESENCE;
  }
  return TrustTier.NEW;
}

export function computeTrustBand(positiveFeedbackCount: number): TrustBand {
  if (positiveFeedbackCount >= 8) return TRUST_BANDS.STRONG;
  if (positiveFeedbackCount >= 3) return TRUST_BANDS.GROWING;
  return TRUST_BANDS.BUILDING;
}
