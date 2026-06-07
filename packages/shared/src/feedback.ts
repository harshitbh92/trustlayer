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
  feltGenuine: likert,
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
    helper: "Tone, politeness, listening.",
  },
  {
    key: "feltComfortable" as const,
    prompt: "Did you feel comfortable during this conversation?",
    helper: "Emotional safety and ease.",
  },
  {
    key: "wasEngaging" as const,
    prompt: "Was the conversation engaging?",
    helper: "Depth, curiosity, momentum.",
  },
  {
    key: "feltGenuine" as const,
    prompt: "Did the other person feel genuine?",
    helper: "Authentic, not performative.",
  },
  {
    key: "wouldReconnect" as const,
    prompt: "Would you talk to this person again?",
    helper: "Reconnect potential.",
  },
  {
    key: "feltNatural" as const,
    prompt: "Did communication feel smooth and natural?",
    helper: "Flow, rhythm, mutual understanding.",
  },
];
