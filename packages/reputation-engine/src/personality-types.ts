import {
  PERSONALITY_DICHOTOMIES,
  PERSONALITY_QUESTIONS,
  type PersonalityPole,
  type PersonalityQuestion,
} from "@trustlayer/shared";

export type LikertAnswers = Record<string, number>;

export interface TraitPercentages {
  reflective: number;
  expressive: number;
  empathetic: number;
  direct: number;
  curious: number;
  grounded: number;
  social: number;
  reserved: number;
  playful: number;
  steady: number;
}

export interface PersonalityTypeResult {
  personalityType: string;
  traitPercentages: TraitPercentages;
  poleScores: Record<PersonalityPole, number>;
  winners: Record<string, PersonalityPole>;
}

const POLES: PersonalityPole[] = [
  "reflective",
  "expressive",
  "empathetic",
  "direct",
  "curious",
  "grounded",
  "social",
  "reserved",
  "playful",
  "steady",
];

const QUESTIONS_BY_ID: Record<string, PersonalityQuestion> = Object.fromEntries(
  PERSONALITY_QUESTIONS.map((q) => [q.id, q]),
);

/** Step 1: shift 1–7 Likert to -3..+3 (neutral = 0). */
export function normalizeLikert(raw: number): number {
  return Math.max(-3, Math.min(3, raw - 4));
}

/** Steps 2–3: weight and sum per pole. Agree pushes toward the question's pole. */
export function sumPoleScores(answers: LikertAnswers): Record<PersonalityPole, number> {
  const scores = Object.fromEntries(POLES.map((p) => [p, 0])) as Record<
    PersonalityPole,
    number
  >;

  for (const [qid, raw] of Object.entries(answers)) {
    const question = QUESTIONS_BY_ID[qid];
    if (!question) continue;
    const normalized = normalizeLikert(raw);
    const weight = question.weight ?? 1;
    scores[question.pole] += normalized * weight;
  }

  return scores;
}

/** Step 4: threshold each dichotomy and compute 16P-style percentages. */
export function computeTraitPercentages(
  poleScores: Record<PersonalityPole, number>,
): { traitPercentages: TraitPercentages; winners: Record<string, PersonalityPole> } {
  const traitPercentages = {} as TraitPercentages;
  const winners = {} as Record<string, PersonalityPole>;

  for (const d of PERSONALITY_DICHOTOMIES) {
    const scoreA = poleScores[d.poleA];
    const scoreB = poleScores[d.poleB];
    const maxDelta = maxPossibleDelta(d.poleA, d.poleB);
    const diff = scoreA - scoreB;
    const pctA = clampPct(50 + (diff / maxDelta) * 50);
    traitPercentages[d.poleA] = pctA;
    traitPercentages[d.poleB] = 100 - pctA;
    winners[d.id] = scoreA >= scoreB ? d.poleA : d.poleB;
  }

  return { traitPercentages, winners };
}

function maxPossibleDelta(poleA: PersonalityPole, poleB: PersonalityPole): number {
  let maxA = 0;
  let maxB = 0;
  for (const q of PERSONALITY_QUESTIONS) {
    const w = q.weight ?? 1;
    if (q.pole === poleA) maxA += 3 * w;
    if (q.pole === poleB) maxB += 3 * w;
  }
  return Math.max(maxA + maxB, 1);
}

function clampPct(n: number): number {
  const rounded = Math.round(n);
  if (rounded === 50) return 50;
  return Math.max(51, Math.min(99, rounded));
}

/** Map first four dichotomy winners to one of 16 archetypes. */
const ARCHETYPE_TABLE: Record<string, string> = {
  "reflective-empathetic-curious-social": "The Warm Explorer",
  "reflective-empathetic-curious-reserved": "The Thoughtful Listener",
  "reflective-empathetic-grounded-social": "The Steady Connector",
  "reflective-empathetic-grounded-reserved": "The Gentle Soul",
  "reflective-direct-curious-social": "The Sharp Conversationalist",
  "reflective-direct-curious-reserved": "The Quiet Analyst",
  "reflective-direct-grounded-social": "The Reliable Host",
  "reflective-direct-grounded-reserved": "The Calm Anchor",
  "expressive-empathetic-curious-social": "The Bold Explorer",
  "expressive-empathetic-curious-reserved": "The Deep Dreamer",
  "expressive-empathetic-grounded-social": "The Heartfelt Connector",
  "expressive-empathetic-grounded-reserved": "The Compassionate Listener",
  "expressive-direct-curious-social": "The Dynamic Debater",
  "expressive-direct-curious-reserved": "The Independent Thinker",
  "expressive-direct-grounded-social": "The Confident Initiator",
  "expressive-direct-grounded-reserved": "The Direct Specialist",
};

export function resolvePersonalityType(
  winners: Record<string, PersonalityPole>,
): string {
  const key = [
    winners.communication,
    winners.empathy,
    winners.curiosity,
    winners.energy,
  ].join("-");
  return ARCHETYPE_TABLE[key] ?? "The Open Conversationalist";
}

export function computePersonalityType(answers: LikertAnswers): PersonalityTypeResult {
  const poleScores = sumPoleScores(answers);
  const { traitPercentages, winners } = computeTraitPercentages(poleScores);
  const personalityType = resolvePersonalityType(winners);
  return { personalityType, traitPercentages, poleScores, winners };
}
