import { PERSONALITY_DICHOTOMIES } from "@trustlayer/shared";

/** Public-facing ring score derived from trait balance (not internal dimension scores). */
export function computePublicPersonalityScore(
  traitPercentages: Record<string, number> | null | undefined,
): number {
  if (!traitPercentages) return 0;

  let sum = 0;
  for (const d of PERSONALITY_DICHOTOMIES) {
    const pctA = traitPercentages[d.poleA] ?? 50;
    const pctB = traitPercentages[d.poleB] ?? 50;
    sum += Math.max(pctA, pctB);
  }
  return Math.round(sum / PERSONALITY_DICHOTOMIES.length);
}
