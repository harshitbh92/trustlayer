import { describe, it, expect } from "vitest";
import {
  computePersonalityScore,
  computeConversationQualityScore,
  computeEmpathyRespectScore,
} from "../personality-score.js";

describe("computePersonalityScore", () => {
  it("weights questionnaire profile at 20%", () => {
    const result = computePersonalityScore({
      qp: 100,
      reliabilityFromQuestionnaire: 100,
      feedback: [],
      postCount: 0,
      commentCount: 0,
      reportCount: 0,
    });
    expect(result.qp).toBe(100);
    expect(result.personalityScore).toBeGreaterThanOrEqual(20);
  });

  it("includes feedback in the composite score", () => {
    const result = computePersonalityScore({
      qp: 80,
      reliabilityFromQuestionnaire: 80,
      feedback: [
        {
          feltRespected: 5,
          feltComfortable: 5,
          wasEngaging: 5,
          conversationDepth: 5,
          wouldReconnect: 5,
          feltNatural: 5,
          createdAt: new Date(),
        },
      ],
      postCount: 2,
      commentCount: 3,
      reportCount: 0,
    });
    expect(result.cq).toBeGreaterThan(70);
    expect(result.er).toBeGreaterThan(70);
    expect(result.personalityScore).toBeGreaterThan(result.qp * 0.2);
  });
});

describe("dimension calculators", () => {
  it("computes CQ from engagement, reconnect, and depth", () => {
    const score = computeConversationQualityScore([
      {
        feltRespected: 5,
        feltComfortable: 5,
        wasEngaging: 5,
        conversationDepth: 5,
        wouldReconnect: 5,
        feltNatural: 5,
        createdAt: new Date(),
      },
    ]);
    expect(score).toBe(100);
  });

  it("computes ER from respect and comfort", () => {
    const score = computeEmpathyRespectScore(
      [
        {
          feltRespected: 5,
          feltComfortable: 5,
          wasEngaging: 4,
          conversationDepth: 4,
          wouldReconnect: 4,
          feltNatural: 4,
          createdAt: new Date(),
        },
      ],
      85,
    );
    expect(score).toBeGreaterThan(80);
  });
});
