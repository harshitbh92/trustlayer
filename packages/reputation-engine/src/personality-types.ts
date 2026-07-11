import {
  MAIN_PERSONALITY_TYPES,
  SUB_PROFILE_TYPES,
  type MainPersonalityType,
  type SubProfileType,
} from "@trustlayer/shared";
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
  personalityType: MainPersonalityType;
  personalitySubType: SubProfileType;
  traitPercentages: TraitPercentages;
  poleScores: Record<PersonalityPole, number>;
  winners: Record<string, PersonalityPole>;
}

type PoleWeights = Partial<Record<PersonalityPole, number>>;

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

const MAIN_TYPE_PROFILES: Record<MainPersonalityType, PoleWeights> = {
  "The Thoughtful Analyst": {
    reflective: 1,
    curious: 1,
    steady: 0.8,
    empathetic: 0.6,
    reserved: 0.7,
    direct: 0.5,
  },
  "The Empathetic Supporter": {
    empathetic: 1,
    reflective: 0.8,
    steady: 0.7,
    social: 0.5,
    reserved: 0.4,
  },
  "The Energetic Connector": {
    social: 1,
    expressive: 1,
    playful: 0.8,
    empathetic: 0.6,
    curious: 0.5,
  },
  "The Independent Explorer": {
    curious: 1,
    reflective: 0.7,
    reserved: 0.7,
    direct: 0.6,
    grounded: 0.3,
  },
  "The Reliable Stabilizer": {
    steady: 1,
    reflective: 0.8,
    empathetic: 0.7,
    grounded: 0.7,
  },
  "The Passionate Debater": {
    direct: 1,
    curious: 0.9,
    expressive: 0.8,
    social: 0.6,
    playful: 0.5,
  },
  "The Creative Storyteller": {
    playful: 1,
    expressive: 1,
    social: 0.7,
    curious: 0.6,
    empathetic: 0.5,
  },
  "The Quiet Observer": {
    reserved: 1,
    reflective: 1,
    steady: 0.8,
    grounded: 0.6,
    empathetic: 0.5,
  },
  "The Ambitious Achiever": {
    direct: 0.9,
    social: 0.8,
    steady: 0.7,
    expressive: 0.7,
    curious: 0.6,
  },
  "The Calm Harmonizer": {
    steady: 1,
    empathetic: 0.9,
    reflective: 0.8,
    grounded: 0.7,
    reserved: 0.4,
  },
};

const SUB_PROFILE_WEIGHTS: Record<SubProfileType, PoleWeights> = {
  "The Anchor": {
    steady: 1,
    reflective: 0.9,
    empathetic: 0.7,
    reserved: 0.6,
    grounded: 0.8,
  },
  "The Catalyst": {
    social: 1,
    expressive: 1,
    playful: 0.8,
    curious: 0.6,
  },
  "The Analyst": {
    curious: 1,
    reflective: 0.9,
    direct: 0.7,
    reserved: 0.6,
    steady: 0.5,
  },
  "The Empath": {
    empathetic: 1,
    reflective: 0.8,
    steady: 0.7,
    reserved: 0.5,
  },
  "The Challenger": {
    direct: 1,
    curious: 0.9,
    expressive: 0.7,
    playful: 0.5,
  },
  "The Observer": {
    reserved: 1,
    reflective: 0.9,
    steady: 0.7,
    grounded: 0.6,
  },
  "The Explorer": {
    curious: 1,
    social: 0.7,
    playful: 0.6,
    empathetic: 0.5,
  },
  "The Diplomat": {
    empathetic: 0.9,
    reflective: 0.8,
    steady: 0.8,
    grounded: 0.7,
    reserved: 0.4,
  },
};

export function normalizeLikert(raw: number): number {
  return Math.max(-3, Math.min(3, raw - 4));
}

export function sumPoleScores(
  answers: LikertAnswers,
): Record<PersonalityPole, number> {
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

function profileMatchScore(
  traitPercentages: TraitPercentages,
  weights: PoleWeights,
): number {
  let sum = 0;
  let weightTotal = 0;
  for (const [pole, weight] of Object.entries(weights) as [
    PersonalityPole,
    number,
  ][]) {
    sum += (traitPercentages[pole] ?? 50) * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? sum / weightTotal : 0;
}

function rankProfiles<T extends string>(
  traitPercentages: TraitPercentages,
  profiles: Record<T, PoleWeights>,
): { best: T; second: T; scores: { key: T; score: number }[] } {
  const scores = (Object.keys(profiles) as T[])
    .map((key) => ({
      key,
      score: profileMatchScore(traitPercentages, profiles[key]),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    best: scores[0]?.key ?? (Object.keys(profiles)[0] as T),
    second: scores[1]?.key ?? (Object.keys(profiles)[1] as T),
    scores,
  };
}

export function resolvePersonalityTypes(
  traitPercentages: TraitPercentages,
): { personalityType: MainPersonalityType; personalitySubType: SubProfileType } {
  const main = rankProfiles(traitPercentages, MAIN_TYPE_PROFILES);
  const sub = rankProfiles(traitPercentages, SUB_PROFILE_WEIGHTS);

  return {
    personalityType: main.best,
    personalitySubType: sub.second,
  };
}

export function computeQuestionnaireProfileScore(
  traitPercentages: TraitPercentages,
): number {
  const empathy = traitPercentages.empathetic;
  const openness = traitPercentages.curious;
  const reliability = traitPercentages.steady;
  const emotionalStability = Math.max(
    traitPercentages.steady,
    traitPercentages.reflective,
  );
  const communicationClarity = Math.max(
    traitPercentages.reflective,
    traitPercentages.expressive,
    traitPercentages.direct,
  );

  return Math.round(
    (empathy + openness + reliability + emotionalStability + communicationClarity) /
      5,
  );
}

export function computePersonalityType(
  answers: LikertAnswers,
): PersonalityTypeResult {
  const poleScores = sumPoleScores(answers);
  const { traitPercentages, winners } = computeTraitPercentages(poleScores);
  const { personalityType, personalitySubType } =
    resolvePersonalityTypes(traitPercentages);

  return {
    personalityType,
    personalitySubType,
    traitPercentages,
    poleScores,
    winners,
  };
}

export { MAIN_PERSONALITY_TYPES, SUB_PROFILE_TYPES };
