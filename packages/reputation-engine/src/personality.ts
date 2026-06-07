import {
  computePersonalityType,
  type LikertAnswers,
  type TraitPercentages,
} from "./personality-types";

export type { LikertAnswers, TraitPercentages };

export interface PersonalityScores {
  personalityType: string;
  traitPercentages: TraitPercentages;
  empathyScore: number;
  opennessScore: number;
  reliabilityScore: number;
  humorScore: number;
  authenticityScore: number;
  communicationStyle: string;
  socialEnergy: string;
  internalScore: number;
}

function pct(score: number): number {
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Compute personality scores from 1–7 Likert questionnaire answers.
 */
export function computePersonalityScores(
  answers: LikertAnswers,
): PersonalityScores {
  const { personalityType, traitPercentages, poleScores, winners } =
    computePersonalityType(answers);

  const empathyScore = pct(traitPercentages.empathetic);
  const opennessScore = pct(traitPercentages.curious);
  const reliabilityScore = pct(traitPercentages.steady);
  const humorScore = pct(traitPercentages.playful);
  const authenticityScore = pct(
    (traitPercentages.empathetic + traitPercentages.reflective) / 2,
  );

  const communicationStyle =
    winners.communication === "reflective"
      ? "Calm communicator"
      : winners.communication === "expressive"
        ? "Expressive communicator"
        : "Diplomatic speaker";

  const socialEnergy =
    winners.energy === "social"
      ? traitPercentages.social >= 70
        ? "High-energy conversationalist"
        : "Balanced social energy"
      : "Introvert-friendly";

  const internalScore = Math.round(
    (empathyScore +
      opennessScore +
      reliabilityScore +
      humorScore +
      authenticityScore) /
      5,
  );

  // Preserve pole scores on result for tag assignment (internal use via winners)
  void poleScores;

  return {
    personalityType,
    traitPercentages,
    empathyScore,
    opennessScore,
    reliabilityScore,
    humorScore,
    authenticityScore,
    communicationStyle,
    socialEnergy,
    internalScore,
  };
}

const ALIAS_ADJECTIVES = [
  "Calm",
  "Quiet",
  "Curious",
  "Bright",
  "Warm",
  "Kind",
  "Witty",
  "Gentle",
  "Bold",
  "Thoughtful",
  "Mellow",
  "Eager",
];

const ALIAS_NOUNS = [
  "Owl",
  "River",
  "Comet",
  "Ember",
  "Willow",
  "Falcon",
  "Lantern",
  "Maple",
  "Harbor",
  "Sparrow",
  "Drift",
  "Echo",
];

export function generateAlias(): string {
  const adj = ALIAS_ADJECTIVES[Math.floor(Math.random() * ALIAS_ADJECTIVES.length)];
  const noun = ALIAS_NOUNS[Math.floor(Math.random() * ALIAS_NOUNS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}${noun}_${num}`;
}
