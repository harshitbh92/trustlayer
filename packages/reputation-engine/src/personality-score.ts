import {
  PERSONALITY_SCORE_DIMENSIONS,
  getPersonalityScoreBand,
} from "@trustlayer/shared";

export interface FeedbackRecord {
  feltRespected: number;
  feltComfortable: number;
  wasEngaging: number;
  conversationDepth: number;
  wouldReconnect: number;
  feltNatural: number;
  createdAt: Date | string;
}

export interface PersonalityScoreBreakdown {
  qp: number;
  cq: number;
  er: number;
  rc: number;
  cp: number;
  gi: number;
  personalityScore: number;
  band: ReturnType<typeof getPersonalityScoreBand>;
}

export interface PersonalityScoreInputs {
  qp: number;
  reliabilityFromQuestionnaire: number;
  feedback: FeedbackRecord[];
  postCount?: number;
  commentCount?: number;
  reportCount?: number;
  safetyProxy?: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function likertTo100(value: number, max = 5) {
  return clamp((value / max) * 100);
}

function weightedFeedbackAverage(
  feedback: FeedbackRecord[],
  selector: (fb: FeedbackRecord) => number,
): number {
  if (feedback.length === 0) return 0;

  const now = Date.now();
  let weightedSum = 0;
  let weightTotal = 0;

  for (const fb of feedback) {
    const ageDays =
      (now - new Date(fb.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const weight =
      ageDays <= 30 ? 0.5 : ageDays <= 90 ? 0.3 : ageDays <= 365 ? 0.2 : 0;
    if (weight <= 0) continue;
    weightedSum += selector(fb) * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) {
    const avg =
      feedback.reduce((sum, fb) => sum + selector(fb), 0) / feedback.length;
    return likertTo100(avg);
  }

  return likertTo100(weightedSum / weightTotal);
}

export function computeConversationQualityScore(
  feedback: FeedbackRecord[],
): number {
  if (feedback.length === 0) return 0;

  const engagement = weightedFeedbackAverage(feedback, (fb) => fb.wasEngaging);
  const reconnect = weightedFeedbackAverage(
    feedback,
    (fb) => fb.wouldReconnect,
  );
  const depth = weightedFeedbackAverage(
    feedback,
    (fb) => fb.conversationDepth,
  );

  return clamp(0.4 * engagement + 0.3 * reconnect + 0.3 * depth);
}

export function computeEmpathyRespectScore(
  feedback: FeedbackRecord[],
  safetyProxy = 70,
): number {
  if (feedback.length === 0) return clamp(safetyProxy * 0.2);

  const respect = weightedFeedbackAverage(feedback, (fb) => fb.feltRespected);
  const comfort = weightedFeedbackAverage(
    feedback,
    (fb) => fb.feltComfortable,
  );

  return clamp(0.5 * respect + 0.3 * comfort + 0.2 * safetyProxy);
}

export function computeReliabilityScore(
  feedback: FeedbackRecord[],
  reliabilityFromQuestionnaire: number,
): number {
  const natural = weightedFeedbackAverage(feedback, (fb) => fb.feltNatural);
  const reconnect = weightedFeedbackAverage(
    feedback,
    (fb) => fb.wouldReconnect,
  );
  const interactionSignal =
    feedback.length > 0 ? 0.5 * natural + 0.5 * reconnect : 0;

  return clamp(
    0.4 * interactionSignal +
      0.3 * reliabilityFromQuestionnaire +
      0.3 * reliabilityFromQuestionnaire,
  );
}

export function computeCommunityParticipationScore(
  postCount = 0,
  commentCount = 0,
  reportCount = 0,
): number {
  const helpful = clamp(Math.min(100, postCount * 8 + commentCount * 4));
  const engagement = clamp(Math.min(100, (postCount + commentCount) * 5));
  const reportFree = reportCount === 0 ? 100 : clamp(100 - reportCount * 25);

  return clamp(0.5 * helpful + 0.3 * engagement + 0.2 * reportFree);
}

export function computeGrowthScore(feedback: FeedbackRecord[]): number {
  if (feedback.length < 2) return 50;

  const now = Date.now();
  const recent = feedback.filter(
    (fb) =>
      (now - new Date(fb.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 30,
  );
  const older = feedback.filter(
    (fb) =>
      (now - new Date(fb.createdAt).getTime()) / (1000 * 60 * 60 * 24) > 30,
  );

  if (recent.length === 0 || older.length === 0) return 55;

  const recentAvg =
    recent.reduce(
      (sum, fb) =>
        sum + (fb.feltRespected + fb.feltComfortable + fb.wasEngaging) / 3,
      0,
    ) / recent.length;
  const olderAvg =
    older.reduce(
      (sum, fb) =>
        sum + (fb.feltRespected + fb.feltComfortable + fb.wasEngaging) / 3,
      0,
    ) / older.length;

  const improvement = Math.max(0, recentAvg - olderAvg);
  const consistencyTrend = Math.min(100, (recentAvg / 5) * 100);

  return clamp(Math.min(100, improvement * 2 * 20 + consistencyTrend * 0.4));
}

export function computePersonalityScore(
  inputs: PersonalityScoreInputs,
): PersonalityScoreBreakdown {
  const qp = clamp(inputs.qp);
  const cq = computeConversationQualityScore(inputs.feedback);
  const er = computeEmpathyRespectScore(
    inputs.feedback,
    inputs.safetyProxy ?? 70,
  );
  const rc = computeReliabilityScore(
    inputs.feedback,
    inputs.reliabilityFromQuestionnaire,
  );
  const cp = computeCommunityParticipationScore(
    inputs.postCount,
    inputs.commentCount,
    inputs.reportCount,
  );
  const gi = computeGrowthScore(inputs.feedback);

  const personalityScore = clamp(
    qp * PERSONALITY_SCORE_DIMENSIONS.qp.weight +
      cq * PERSONALITY_SCORE_DIMENSIONS.cq.weight +
      er * PERSONALITY_SCORE_DIMENSIONS.er.weight +
      rc * PERSONALITY_SCORE_DIMENSIONS.rc.weight +
      cp * PERSONALITY_SCORE_DIMENSIONS.cp.weight +
      gi * PERSONALITY_SCORE_DIMENSIONS.gi.weight,
  );

  return {
    qp,
    cq,
    er,
    rc,
    cp,
    gi,
    personalityScore,
    band: getPersonalityScoreBand(personalityScore),
  };
}

export function getScoreStrengths(breakdown: PersonalityScoreBreakdown): string[] {
  const entries = [
    { label: "Thoughtful questionnaire profile", score: breakdown.qp },
    { label: "Engaging conversations", score: breakdown.cq },
    { label: "Empathetic and respectful presence", score: breakdown.er },
    { label: "Reliable follow-through", score: breakdown.rc },
    { label: "Positive community participation", score: breakdown.cp },
    { label: "Recent improvement trend", score: breakdown.gi },
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((entry) => entry.score >= 55)
    .map((entry) => entry.label);

  return entries.length > 0
    ? entries
    : ["Building your interaction profile through real conversations"];
}
