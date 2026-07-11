import { describe, expect, it } from "vitest";
import {
  assistTagAwards,
  mergeTagAssignments,
  proposeTagsHeuristically,
  validateAndNormalizeTagProposals,
} from "../ai-assist.js";
import { tagsFromFeedback } from "../tags.js";

const strongFeedback = {
  feltRespected: 5,
  feltComfortable: 5,
  wasEngaging: 5,
  conversationDepth: 5,
  wouldReconnect: 5,
  feltNatural: 5,
};

const weakFeedback = {
  feltRespected: 2,
  feltComfortable: 2,
  wasEngaging: 2,
  conversationDepth: 2,
  wouldReconnect: 2,
  feltNatural: 2,
};

describe("proposeTagsHeuristically", () => {
  it("returns no proposals for weak feedback", () => {
    expect(proposeTagsHeuristically(weakFeedback)).toEqual([]);
  });

  it("skips negative overall feelings", () => {
    expect(
      proposeTagsHeuristically(strongFeedback, { overallFeeling: "uneasy" }),
    ).toEqual([]);
  });

  it("proposes catalog tags for strong uplifted sessions", () => {
    const proposals = proposeTagsHeuristically(strongFeedback, {
      overallFeeling: "uplifted",
    });
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.every((p) => p.confidence >= 0.55)).toBe(true);
    expect(proposals.some((p) => p.slug === "encouraging")).toBe(true);
  });
});

describe("validateAndNormalizeTagProposals", () => {
  it("drops unknown and low-confidence slugs", () => {
    const cleaned = validateAndNormalizeTagProposals([
      { slug: "respectful", confidence: 0.9 },
      { slug: "toxic-person", confidence: 0.99 },
      { slug: "funny", confidence: 0.2 },
    ]);
    expect(cleaned.map((p) => p.slug)).toEqual(["respectful"]);
  });

  it("caps the number of accepted proposals", () => {
    const cleaned = validateAndNormalizeTagProposals(
      [
        { slug: "respectful", confidence: 0.9 },
        { slug: "funny", confidence: 0.8 },
        { slug: "empathetic", confidence: 0.7 },
        { slug: "insightful", confidence: 0.65 },
      ],
      { maxAiTags: 2 },
    );
    expect(cleaned).toHaveLength(2);
  });
});

describe("mergeTagAssignments", () => {
  it("keeps rule tags and adds AI-only tags at scaled strength", () => {
    const rules = tagsFromFeedback(strongFeedback);
    const { merged, fromAi, fromRules } = mergeTagAssignments(rules, [
      { slug: "encouraging", confidence: 0.8 },
      { slug: "respectful", confidence: 0.9 },
    ]);

    expect(fromRules.length).toBeGreaterThan(0);
    expect(fromAi).toContain("encouraging");
    expect(fromAi).not.toContain("respectful");

    const encouraging = merged.find((t) => t.slug === "encouraging");
    expect(encouraging?.strengthDelta).toBeCloseTo(0.08, 5);
  });
});

describe("assistTagAwards", () => {
  it("merges heuristic assist with rule tags", () => {
    const result = assistTagAwards(strongFeedback, {
      overallFeeling: "uplifted",
      mood: "fun",
    });
    expect(result.merged.length).toBeGreaterThanOrEqual(result.fromRules.length);
    expect(result.heuristicProposals.length).toBeGreaterThan(0);
  });
});
