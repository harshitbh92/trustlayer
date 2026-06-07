import { describe, it, expect } from "vitest";
import {
  normalizeLikert,
  sumPoleScores,
  computeTraitPercentages,
  computePersonalityType,
  resolvePersonalityType,
} from "../personality-types.js";
import { PERSONALITY_QUESTIONS } from "@trustlayer/shared";

describe("normalizeLikert", () => {
  it("centers neutral at zero", () => {
    expect(normalizeLikert(4)).toBe(0);
    expect(normalizeLikert(1)).toBe(-3);
    expect(normalizeLikert(7)).toBe(3);
  });
});

describe("sumPoleScores", () => {
  it("adds weighted scores toward agreed poles", () => {
    const scores = sumPoleScores({
      q01: 7,
      q02: 1,
    });
    expect(scores.empathetic).toBeGreaterThan(0);
    expect(scores.direct).toBeLessThan(0);
  });
});

describe("computeTraitPercentages", () => {
  it("returns complementary percentages per dichotomy", () => {
    const poleScores = sumPoleScores({ q01: 7, q11: 7, q19: 7 });
    const { traitPercentages } = computeTraitPercentages(poleScores);
    expect(traitPercentages.empathetic + traitPercentages.direct).toBe(100);
    expect(traitPercentages.empathetic).toBeGreaterThanOrEqual(51);
  });
});

describe("resolvePersonalityType", () => {
  it("maps pole winners to a named archetype", () => {
    const type = resolvePersonalityType({
      communication: "reflective",
      empathy: "empathetic",
      curiosity: "curious",
      energy: "reserved",
      tone: "steady",
    });
    expect(type).toBe("The Thoughtful Listener");
  });
});

describe("computePersonalityType", () => {
  it("produces a full result for all questions answered agree", () => {
    const answers = Object.fromEntries(
      PERSONALITY_QUESTIONS.map((q) => [q.id, 7]),
    );
    const result = computePersonalityType(answers);
    expect(result.personalityType).toBeTruthy();
    expect(result.traitPercentages.empathetic).toBeGreaterThanOrEqual(51);
  });
});
