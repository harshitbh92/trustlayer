import { z } from "zod";

export const OVERALL_FEELING_OPTIONS = [
  "uplifted",
  "comfortable",
  "neutral",
  "drained",
  "uneasy",
] as const;

export type OverallFeeling = (typeof OVERALL_FEELING_OPTIONS)[number];

const likert = z.number().int().min(1).max(5);

export const interactionFeedbackSchema = z.object({
  feltRespected: likert,
  feltComfortable: likert,
  wasEngaging: likert,
  conversationDepth: likert,
  wouldReconnect: likert,
  feltNatural: likert,
  overallFeeling: z.enum(OVERALL_FEELING_OPTIONS),
});

export type InteractionFeedbackInput = z.infer<
  typeof interactionFeedbackSchema
>;

export const FEEDBACK_QUESTIONS = [
  {
    key: "feltRespected" as const,
    prompt: "Did you feel respected?",
    helper: "Tone, politeness, and listening.",
  },
  {
    key: "feltComfortable" as const,
    prompt: "Did you feel emotionally safe?",
    helper: "Comfort and ease during the chat.",
  },
  {
    key: "wasEngaging" as const,
    prompt: "Was the conversation engaging?",
    helper: "Curiosity, momentum, and interest.",
  },
  {
    key: "conversationDepth" as const,
    prompt: "Did the conversation feel meaningful or deep?",
    helper: "Substance beyond surface-level chat.",
  },
  {
    key: "wouldReconnect" as const,
    prompt: "Would you talk to this person again?",
    helper: "Reconnect potential.",
  },
  {
    key: "feltNatural" as const,
    prompt: "Did communication flow naturally?",
    helper: "Rhythm, pacing, and mutual understanding.",
  },
];
