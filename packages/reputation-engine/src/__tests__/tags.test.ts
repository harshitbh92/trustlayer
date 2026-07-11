import { describe, it, expect } from "vitest";
import { tagsFromFeedback, initialTagsFromPersonality } from "../tags.js";
import type { PersonalityScores } from "../personality.js";

const baseScores = (
  overrides: Partial<PersonalityScores> = {},
): PersonalityScores => ({
  personalityType: "The Thoughtful Analyst",
  personalitySubType: "The Analyst",
  traitPercentages: {
    reflective: 60,
    expressive: 40,
    empathetic: 70,
    direct: 30,
    curious: 55,
    grounded: 45,
    social: 40,
    reserved: 60,
    playful: 45,
    steady: 55,
  },
  empathyScore: 50,
  opennessScore: 50,
  reliabilityScore: 50,
  humorScore: 50,
  authenticityScore: 50,
  communicationStyle: "Calm communicator",
  socialEnergy: "Introvert-friendly",
  qpScore: 50,
  internalScore: 50,
  ...overrides,
});

describe("tagsFromFeedback", () => {
  it("returns no tags for mediocre feedback", () => {
    const tags = tagsFromFeedback({
      feltRespected: 3,
      feltComfortable: 3,
      wasEngaging: 3,
      conversationDepth: 3,
      wouldReconnect: 3,
      feltNatural: 3,
    });
    expect(tags).toEqual([]);
  });

  it("awards multiple tags on strongly positive feedback", () => {
    const tags = tagsFromFeedback({
      feltRespected: 5,
      feltComfortable: 5,
      wasEngaging: 5,
      conversationDepth: 5,
      wouldReconnect: 5,
      feltNatural: 5,
    });
    const slugs = tags.map((t) => t.slug);
    expect(slugs).toContain("respectful");
    expect(slugs).toContain("great-listener");
    expect(slugs).toContain("long-term-connector");
    expect(slugs).toContain("deep-conversation-lover");
  });

  it("never returns a punitive tag slug", () => {
    const tags = tagsFromFeedback({
      feltRespected: 1,
      feltComfortable: 1,
      wasEngaging: 1,
      conversationDepth: 1,
      wouldReconnect: 1,
      feltNatural: 1,
    });
    for (const t of tags) {
      expect(["toxic", "rude", "creepy", "bad"]).not.toContain(t.slug);
    }
  });
});

describe("initialTagsFromPersonality", () => {
  it("assigns initial tags for thoughtful analyst", () => {
    const tags = initialTagsFromPersonality(
      baseScores({
        personalityType: "The Thoughtful Analyst",
        communicationStyle: "Calm communicator",
        socialEnergy: "Introvert-friendly",
      }),
    );
    const slugs = tags.map((t) => t.slug);
    expect(slugs).toContain("analytical");
    expect(slugs).toContain("deep-thinker");
    expect(slugs).toContain("calm-communicator");
    expect(slugs).toContain("introvert-friendly");
  });

  it("assigns energetic connector tags", () => {
    const tags = initialTagsFromPersonality(
      baseScores({
        personalityType: "The Energetic Connector",
        communicationStyle: "Expressive communicator",
        socialEnergy: "High-energy conversationalist",
      }),
    );
    const slugs = tags.map((t) => t.slug);
    expect(slugs).toContain("energetic");
    expect(slugs).toContain("friendly");
    expect(slugs).toContain("expressive-communicator");
    expect(slugs).toContain("high-energy-conversationalist");
  });
});
