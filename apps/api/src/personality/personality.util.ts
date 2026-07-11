/** Public-facing personality score comes from the composite Personality & Interaction Score. */
export function computePublicPersonalityScore(
  personalityScore: number | null | undefined,
): number {
  return Math.max(0, Math.min(100, Math.round(personalityScore ?? 0)));
}
