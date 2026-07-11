import {
  INITIAL_TAGS_BY_MAIN_TYPE,
  type MainPersonalityType,
} from "@trustlayer/shared";
import { TAG_BY_SLUG } from "@trustlayer/shared";
import type { PersonalityScores } from "./personality";

export interface FeedbackForTags {
  feltRespected: number;
  feltComfortable: number;
  wasEngaging: number;
  conversationDepth: number;
  wouldReconnect: number;
  feltNatural: number;
}

export interface TagAssignment {
  slug: string;
  strengthDelta: number;
}

export function tagsFromFeedback(fb: FeedbackForTags): TagAssignment[] {
  const out: TagAssignment[] = [];
  const push = (slug: string, delta = 0.15) => {
    if (TAG_BY_SLUG[slug]) out.push({ slug, strengthDelta: delta });
  };

  if (fb.feltRespected >= 4 && fb.feltComfortable >= 4) {
    push("respectful");
    push("emotionally-intelligent", 0.12);
  }
  if (fb.feltComfortable >= 4) push("supportive");
  if (fb.wasEngaging >= 4 && fb.feltNatural >= 4) push("easy-to-talk-to");
  if (fb.wasEngaging >= 4 && fb.conversationDepth >= 4) {
    push("deep-conversation-lover");
  }
  if (fb.conversationDepth >= 4) push("thoughtful-responder");
  if (fb.wasEngaging >= 4) push("engaging-speaker");
  if (fb.feltRespected === 5 && fb.feltComfortable === 5) {
    push("great-listener", 0.2);
  }
  if (fb.wouldReconnect >= 4 && fb.feltNatural >= 4) {
    push("long-term-connector");
    push("reliable");
  }
  if (fb.wasEngaging >= 4 && fb.conversationDepth >= 4) {
    push("insightful", 0.12);
  }
  if (fb.feltRespected >= 4 && fb.wasEngaging >= 4) {
    push("positive-presence", 0.12);
  }

  return out;
}

export function initialTagsFromPersonality(
  scores: PersonalityScores,
): TagAssignment[] {
  const out: TagAssignment[] = [];
  const push = (slug: string, strength = 0.7) => {
    if (TAG_BY_SLUG[slug]) out.push({ slug, strengthDelta: strength });
  };

  const mainType = scores.personalityType as MainPersonalityType;
  const initialTags = INITIAL_TAGS_BY_MAIN_TYPE[mainType] ?? [];
  for (const slug of initialTags) {
    push(slug, 0.72);
  }

  if (scores.communicationStyle === "Calm communicator") {
    push("calm-communicator", 0.55);
  } else if (scores.communicationStyle === "Expressive communicator") {
    push("expressive-communicator", 0.55);
  } else {
    push("diplomatic-speaker", 0.55);
  }

  if (scores.socialEnergy === "High-energy conversationalist") {
    push("high-energy-conversationalist", 0.5);
  } else if (scores.socialEnergy === "Introvert-friendly") {
    push("introvert-friendly", 0.5);
  }

  return out;
}
