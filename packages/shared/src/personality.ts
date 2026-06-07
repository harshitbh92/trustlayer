export type PersonalityPole =
  | "reflective"
  | "expressive"
  | "empathetic"
  | "direct"
  | "curious"
  | "grounded"
  | "social"
  | "reserved"
  | "playful"
  | "steady";

export const PERSONALITY_DICHOTOMIES: {
  id: string;
  label: string;
  poleA: PersonalityPole;
  poleB: PersonalityPole;
}[] = [
  { id: "communication", label: "Communication", poleA: "reflective", poleB: "expressive" },
  { id: "empathy", label: "Empathy", poleA: "empathetic", poleB: "direct" },
  { id: "curiosity", label: "Curiosity", poleA: "curious", poleB: "grounded" },
  { id: "energy", label: "Social energy", poleA: "social", poleB: "reserved" },
  { id: "tone", label: "Tone", poleA: "playful", poleB: "steady" },
];

export interface PersonalityQuestion {
  id: string;
  statement: string;
  pole: PersonalityPole;
  weight?: number;
}

export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: "q01",
    statement: "You naturally make people feel heard when they share something difficult.",
    pole: "empathetic",
  },
  {
    id: "q02",
    statement: "You prefer getting to the point rather than exploring every angle.",
    pole: "direct",
  },
  {
    id: "q03",
    statement: "Complex or abstract topics excite you more than small talk.",
    pole: "curious",
  },
  {
    id: "q04",
    statement: "You feel most comfortable sticking to familiar topics in conversation.",
    pole: "grounded",
  },
  {
    id: "q05",
    statement: "You feel energized after meeting new people in group settings.",
    pole: "social",
  },
  {
    id: "q06",
    statement: "You feel drained after long group conversations.",
    pole: "reserved",
  },
  {
    id: "q07",
    statement: "You often use humor to keep conversations light.",
    pole: "playful",
  },
  {
    id: "q08",
    statement: "You prefer conversations that stay serious and focused.",
    pole: "steady",
  },
  {
    id: "q09",
    statement: "You think carefully before speaking in disagreements.",
    pole: "reflective",
  },
  {
    id: "q10",
    statement: "You speak your mind quickly when you have something to say.",
    pole: "expressive",
  },
  {
    id: "q11",
    statement: "You regularly ask follow-up questions to understand someone better.",
    pole: "empathetic",
    weight: 1.2,
  },
  {
    id: "q12",
    statement: "You value honesty over cushioning hard truths.",
    pole: "direct",
  },
  {
    id: "q13",
    statement: "You enjoy debating ideas even when you disagree.",
    pole: "curious",
  },
  {
    id: "q14",
    statement: "You prefer practical, concrete topics over theoretical ones.",
    pole: "grounded",
  },
  {
    id: "q15",
    statement: "You are usually the one who keeps a conversation going.",
    pole: "social",
  },
  {
    id: "q16",
    statement: "You are comfortable letting others lead the conversation.",
    pole: "reserved",
  },
  {
    id: "q17",
    statement: "You feel energized after deep one-on-one conversations.",
    pole: "reflective",
  },
  {
    id: "q18",
    statement: "You express emotions openly when you talk to people.",
    pole: "expressive",
  },
  {
    id: "q19",
    statement: "People often come to you when they need emotional support.",
    pole: "empathetic",
    weight: 1.2,
  },
  {
    id: "q20",
    statement: "You find it easy to make strangers feel at ease quickly.",
    pole: "social",
    weight: 1.1,
  },
];
