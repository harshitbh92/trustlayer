/**
 * Weighted dimension aggregation.
 *
 * Phase 1 wires only questionnaire + conversation feedback signals; the rest
 * are stubbed at 0 with the contract that Phase 2/3 will populate them. The
 * weights match the product blueprint and are intentionally kept here in one
 * place so they remain easy to audit and tune.
 */

export const WEIGHTS = {
  questionnaire: 0.15,
  feedback: 0.3,
  longTerm: 0.2,
  aiToxicity: 0.15,
  community: 0.1,
  posts: 0.1,
} as const;

export interface ReputationInputs {
  questionnaireScore: number; // 0–100 (personality internalScore)
  feedbackScore: number; // 0–100 (averaged feel-based feedback)
  longTermScore?: number; // 0–100, Phase 2+
  aiToxicityScore?: number; // 0–100, Phase 3 (higher = safer)
  communityScore?: number; // 0–100, Phase 2
  postScore?: number; // 0–100, Phase 1 minimal signal
}

export interface ReputationBreakdown {
  internalScore: number;
  components: Record<keyof typeof WEIGHTS, number>;
}

const clamp01_100 = (n: number) => Math.max(0, Math.min(100, n));

export function computeReputation(
  inputs: ReputationInputs,
): ReputationBreakdown {
  const components = {
    questionnaire: clamp01_100(inputs.questionnaireScore) * WEIGHTS.questionnaire,
    feedback: clamp01_100(inputs.feedbackScore) * WEIGHTS.feedback,
    longTerm: clamp01_100(inputs.longTermScore ?? 0) * WEIGHTS.longTerm,
    aiToxicity: clamp01_100(inputs.aiToxicityScore ?? 0) * WEIGHTS.aiToxicity,
    community: clamp01_100(inputs.communityScore ?? 0) * WEIGHTS.community,
    posts: clamp01_100(inputs.postScore ?? 0) * WEIGHTS.posts,
  };
  const internalScore = Math.round(
    Object.values(components).reduce((s, v) => s + v, 0),
  );
  return { internalScore, components };
}

/**
 * Average the six feel-based feedback Likert values (1–5) and scale to 0–100.
 */
export function feedbackAverageToScore(values: {
  feltRespected: number;
  feltComfortable: number;
  wasEngaging: number;
  conversationDepth: number;
  wouldReconnect: number;
  feltNatural: number;
}): number {
  const sum =
    values.feltRespected +
    values.feltComfortable +
    values.wasEngaging +
    values.conversationDepth +
    values.wouldReconnect +
    values.feltNatural;
  const avg = sum / 6;
  return Math.round((avg / 5) * 100);
}
