import { describe, it, expect } from "vitest";
import { computeTrustBand, computeTrustTier } from "../tiers.js";
import { TrustTier } from "@trustlayer/shared";

describe("computeTrustTier", () => {
  it("returns NEW for unverified, no positive feedback", () => {
    expect(
      computeTrustTier({
        positiveFeedbackCount: 0,
        earnedTagCount: 0,
        isVerified: false,
      }),
    ).toBe(TrustTier.NEW);
  });

  it("promotes verified users with no feedback to VERIFIED_PRESENCE", () => {
    expect(
      computeTrustTier({
        positiveFeedbackCount: 0,
        earnedTagCount: 0,
        isVerified: true,
      }),
    ).toBe(TrustTier.VERIFIED_PRESENCE);
  });

  it("promotes to TRUSTED_COMMUNICATOR at the documented thresholds", () => {
    expect(
      computeTrustTier({
        positiveFeedbackCount: 8,
        earnedTagCount: 3,
        isVerified: false,
      }),
    ).toBe(TrustTier.TRUSTED_COMMUNICATOR);
  });
});

describe("computeTrustBand", () => {
  it("Building → Growing → Strong as feedback grows", () => {
    expect(computeTrustBand(0)).toBe("Building");
    expect(computeTrustBand(4)).toBe("Growing trust");
    expect(computeTrustBand(20)).toBe("Strong positive signals");
  });
});
