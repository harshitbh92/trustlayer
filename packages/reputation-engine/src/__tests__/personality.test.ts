import { describe, it, expect } from "vitest";
import { computePersonalityScores, generateAlias } from "../personality.js";
import { PERSONALITY_QUESTIONS } from "@trustlayer/shared";

const allSevens = Object.fromEntries(
  PERSONALITY_QUESTIONS.map((q) => [q.id, 7]),
);

describe("computePersonalityScores", () => {
  it("returns defaults for empty answers", () => {
    const s = computePersonalityScores({});
    expect(s.personalityType).toBeTruthy();
    expect(s.internalScore).toBeGreaterThan(0);
    expect(s.traitPercentages.empathetic).toBe(50);
  });

  it("yields high empathy when empathetic questions are strongly agreed", () => {
    const s = computePersonalityScores({
      q01: 7,
      q11: 7,
      q19: 7,
    });
    expect(s.traitPercentages.empathetic).toBeGreaterThanOrEqual(65);
    expect(s.empathyScore).toBeGreaterThanOrEqual(65);
  });

  it("assigns a personality type and trait percentages", () => {
    const s = computePersonalityScores(allSevens);
    expect(s.personalityType).toMatch(/^The /);
    expect(s.traitPercentages.social).toBeGreaterThanOrEqual(51);
  });

  it("labels reflective communication when reflective poles dominate", () => {
    const s = computePersonalityScores({
      q09: 7,
      q17: 7,
      q10: 1,
      q18: 1,
    });
    expect(s.communicationStyle).toBe("Calm communicator");
  });
});

describe("generateAlias", () => {
  it("produces an Adjective+Noun_NNNN string", () => {
    const a = generateAlias();
    expect(a).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+_\d{4}$/);
  });
});
