import { describe, it, expect } from "vitest";
import {
  computeReputation,
  feedbackAverageToScore,
  WEIGHTS,
} from "../calculate.js";

describe("computeReputation", () => {
  it("respects declared weights and clamps inputs", () => {
    const r = computeReputation({
      questionnaireScore: 100,
      feedbackScore: 100,
    });
    const expected = Math.round((WEIGHTS.questionnaire + WEIGHTS.feedback) * 100);
    expect(r.internalScore).toBe(expected);
  });

  it("treats missing inputs as 0", () => {
    const r = computeReputation({
      questionnaireScore: 0,
      feedbackScore: 0,
    });
    expect(r.internalScore).toBe(0);
  });

  it("clamps over/under-range inputs", () => {
    const r = computeReputation({
      questionnaireScore: 999,
      feedbackScore: -50,
    });
    expect(r.components.questionnaire).toBeCloseTo(100 * WEIGHTS.questionnaire);
    expect(r.components.feedback).toBe(0);
  });
});

describe("feedbackAverageToScore", () => {
  it("maps 5/5 across the board to 100", () => {
    const s = feedbackAverageToScore({
      feltRespected: 5,
      feltComfortable: 5,
      wasEngaging: 5,
      feltGenuine: 5,
      wouldReconnect: 5,
      feltNatural: 5,
    });
    expect(s).toBe(100);
  });

  it("maps 1/5 across the board to 20", () => {
    const s = feedbackAverageToScore({
      feltRespected: 1,
      feltComfortable: 1,
      wasEngaging: 1,
      feltGenuine: 1,
      wouldReconnect: 1,
      feltNatural: 1,
    });
    expect(s).toBe(20);
  });
});
