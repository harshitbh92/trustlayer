import { TAG_BY_SLUG } from "@trustlayer/shared";
import type { PersonalityScores } from "./personality";

export interface FeedbackForTags {
  feltRespected: number;
  feltComfortable: number;
  wasEngaging: number;
  feltGenuine: number;
  wouldReconnect: number;
  feltNatural: number;
}

export interface TagAssignment {
  slug: string;
  strengthDelta: number;
}

/**
 * Tags earned from a single feel-based feedback submission. Strength is a
 * small increment per session so tags accrete from real, repeated signals
 * rather than from any single rater.
 *
 * Only positive or neutral tags. Negative signals stay in moderation tables.
 */
export function tagsFromFeedback(fb: FeedbackForTags): TagAssignment[] {
  const out: TagAssignment[] = [];
  const push = (slug: string, delta = 0.15) => {
    if (TAG_BY_SLUG[slug]) out.push({ slug, strengthDelta: delta });
  };

  if (fb.feltRespected >= 4 && fb.feltComfortable >= 4) push("respectful");
  if (fb.wasEngaging >= 4 && fb.feltNatural >= 4) push("easy-to-talk-to");
  if (fb.feltGenuine >= 4) push("genuine");
  if (fb.feltComfortable >= 4 && fb.wouldReconnect >= 4) push("friendly");
  if (fb.wasEngaging >= 4 && fb.feltGenuine >= 4) push("thoughtful");
  if (fb.feltRespected === 5 && fb.feltComfortable === 5) {
    push("great-listener", 0.2);
  }
  if (fb.wouldReconnect >= 4 && fb.feltNatural >= 4) push("reliable");

  return out;
}

const PERSONALITY_TYPE_TAGS: Record<string, string> = {
  "The Warm Explorer": "warm-connector",
  "The Thoughtful Listener": "deep-listener",
  "The Steady Connector": "warm-connector",
  "The Gentle Soul": "gentle-presence",
  "The Sharp Conversationalist": "bold-initiator",
  "The Quiet Analyst": "reflective-soul",
  "The Reliable Host": "steady-anchor",
  "The Calm Anchor": "steady-anchor",
  "The Bold Explorer": "idea-explorer",
  "The Deep Dreamer": "reflective-soul",
  "The Heartfelt Connector": "warm-connector",
  "The Compassionate Listener": "deep-listener",
  "The Dynamic Debater": "bold-initiator",
  "The Independent Thinker": "idea-explorer",
  "The Confident Initiator": "bold-initiator",
  "The Direct Specialist": "direct-speaker",
  "The Open Conversationalist": "easy-to-talk-to",
};

/**
 * Initial neutral style tags assigned after onboarding. These describe how
 * someone tends to communicate — they are never punitive and never imply
 * the person is "good" or "bad".
 */
export function initialTagsFromPersonality(
  scores: PersonalityScores,
): TagAssignment[] {
  const out: TagAssignment[] = [];
  const push = (slug: string, strength = 0.6) => {
    if (TAG_BY_SLUG[slug]) out.push({ slug, strengthDelta: strength });
  };

  const typeTag = PERSONALITY_TYPE_TAGS[scores.personalityType];
  if (typeTag) push(typeTag, 0.75);

  switch (scores.communicationStyle) {
    case "Calm communicator":
      push("calm-communicator");
      push("reflective-soul", 0.5);
      break;
    case "Expressive communicator":
      push("expressive-communicator");
      break;
    case "Diplomatic speaker":
      push("direct-speaker", 0.5);
      break;
  }

  switch (scores.socialEnergy) {
    case "High-energy conversationalist":
      push("high-energy");
      break;
    case "Introvert-friendly":
      push("introvert-friendly");
      break;
  }

  const tp = scores.traitPercentages;
  if (tp.empathetic >= 65) push("empathetic", 0.55);
  if (tp.playful >= 65) push("witty-spirit", 0.5);
  if (tp.curious >= 65) push("idea-explorer", 0.5);
  if (tp.reflective >= 65) push("deep-listener", 0.45);
  if (tp.social >= 65) push("warm-connector", 0.45);
  if (tp.steady >= 65) push("steady-anchor", 0.45);
  if (scores.empathyScore >= 80) push("empathetic", 0.5);
  if (scores.humorScore >= 80) push("playful", 0.5);
  if (scores.opennessScore >= 80) push("curious-mind", 0.5);
  if (scores.authenticityScore >= 80) push("genuine", 0.4);

  return out;
}
