/** Ten main personality archetypes assigned from onboarding. */
export const MAIN_PERSONALITY_TYPES = [
  "The Thoughtful Analyst",
  "The Empathetic Supporter",
  "The Energetic Connector",
  "The Independent Explorer",
  "The Reliable Stabilizer",
  "The Passionate Debater",
  "The Creative Storyteller",
  "The Quiet Observer",
  "The Ambitious Achiever",
  "The Calm Harmonizer",
] as const;

export type MainPersonalityType = (typeof MAIN_PERSONALITY_TYPES)[number];

/** Eight sub-profiles — second-best match from the same questionnaire. */
export const SUB_PROFILE_TYPES = [
  "The Anchor",
  "The Catalyst",
  "The Analyst",
  "The Empath",
  "The Challenger",
  "The Observer",
  "The Explorer",
  "The Diplomat",
] as const;

export type SubProfileType = (typeof SUB_PROFILE_TYPES)[number];

export const MAIN_PERSONALITY_TYPE_INFO: Record<
  MainPersonalityType,
  { summary: string; traits: string }
> = {
  "The Thoughtful Analyst": {
    summary:
      "Reflective and idea-driven. Prefers careful reasoning, depth, and well-considered responses.",
    traits: "Reflective · Curious · Steady · Reserved",
  },
  "The Empathetic Supporter": {
    summary:
      "Warm and emotionally attuned. Makes others feel heard, safe, and encouraged.",
    traits: "Empathetic · Reflective · Steady · Supportive",
  },
  "The Energetic Connector": {
    summary:
      "Social and expressive. Brings momentum, warmth, and lively conversation energy.",
    traits: "Social · Expressive · Playful · Engaging",
  },
  "The Independent Explorer": {
    summary:
      "Curious and self-directed. Explores ideas freely and values personal perspective.",
    traits: "Curious · Reflective · Reserved · Direct",
  },
  "The Reliable Stabilizer": {
    summary:
      "Consistent and grounding. Shows up steadily and keeps conversations dependable.",
    traits: "Steady · Reflective · Empathetic · Grounded",
  },
  "The Passionate Debater": {
    summary:
      "Direct and intellectually sharp. Enjoys spirited discussion and clear viewpoints.",
    traits: "Direct · Curious · Expressive · Bold",
  },
  "The Creative Storyteller": {
    summary:
      "Imaginative and expressive. Uses stories, humor, and vivid language to connect.",
    traits: "Playful · Expressive · Social · Creative",
  },
  "The Quiet Observer": {
    summary:
      "Reserved and perceptive. Listens closely, notices nuance, and speaks with care.",
    traits: "Reserved · Reflective · Steady · Observant",
  },
  "The Ambitious Achiever": {
    summary:
      "Driven and socially confident. Focuses conversations on progress, clarity, and action.",
    traits: "Direct · Social · Steady · Expressive",
  },
  "The Calm Harmonizer": {
    summary:
      "Diplomatic and steady. Softens tension and helps conversations stay balanced.",
    traits: "Steady · Empathetic · Reflective · Grounded",
  },
};

export const SUB_PROFILE_TYPE_INFO: Record<
  SubProfileType,
  { summary: string; traits: string }
> = {
  "The Anchor": {
    summary: "Stabilizing presence that keeps conversations grounded and reliable.",
    traits: "Steady · Reflective · Grounded",
  },
  "The Catalyst": {
    summary: "Sparks energy and gets people talking with expressive social momentum.",
    traits: "Social · Expressive · Playful",
  },
  "The Analyst": {
    summary: "Brings structure and curiosity — digs into ideas with clear thinking.",
    traits: "Curious · Reflective · Direct",
  },
  "The Empath": {
    summary: "Tunes into feelings and responds with care and emotional awareness.",
    traits: "Empathetic · Reflective · Steady",
  },
  "The Challenger": {
    summary: "Pushes ideas forward with direct questions and constructive friction.",
    traits: "Direct · Curious · Expressive",
  },
  "The Observer": {
    summary: "Quietly attentive — notices details before jumping in.",
    traits: "Reserved · Reflective · Steady",
  },
  "The Explorer": {
    summary: "Open to new topics and perspectives; keeps conversation adventurous.",
    traits: "Curious · Social · Playful",
  },
  "The Diplomat": {
    summary: "Balances viewpoints and helps people feel respected in disagreement.",
    traits: "Empathetic · Reflective · Steady",
  },
};

export const PERSONALITY_TYPE_ASSIGNMENT_STEPS = [
  {
    title: "Answer the questionnaire",
    body: "Your onboarding answers score five trait pairs: communication, empathy, curiosity, social energy, and tone.",
  },
  {
    title: "Build a trait profile",
    body: "Each answer nudges poles like Reflective vs Expressive or Empathetic vs Direct. That creates your trait balance percentages.",
  },
  {
    title: "Match main personality type",
    body: "We compare your trait profile to 10 archetypes and assign the closest match as your main personality type.",
  },
  {
    title: "Assign a sub-profile",
    body: "Your second-strongest style becomes the sub-profile (for example The Challenger), adding nuance beside the main type.",
  },
  {
    title: "Types stay stable; tags evolve",
    body: "Type and sub-profile come from onboarding. Reputation tags and interaction score keep updating from real conversations and feedback.",
  },
] as const;
export const INITIAL_TAGS_BY_MAIN_TYPE: Record<
  MainPersonalityType,
  readonly string[]
> = {
  "The Thoughtful Analyst": [
    "analytical",
    "deep-thinker",
    "calm-communicator",
    "curious-mind",
  ],
  "The Empathetic Supporter": [
    "empathetic",
    "great-listener",
    "supportive",
    "genuine",
  ],
  "The Energetic Connector": [
    "energetic",
    "friendly",
    "easy-to-talk-to",
    "expressive-communicator",
  ],
  "The Independent Explorer": [
    "independent-thinker",
    "open-minded",
    "adventurous",
    "curious-mind",
  ],
  "The Reliable Stabilizer": [
    "reliable",
    "consistent",
    "trusted-member",
    "mature-conversationalist",
  ],
  "The Passionate Debater": [
    "debate-oriented",
    "direct-speaker",
    "insightful",
    "intellectually-curious",
  ],
  "The Creative Storyteller": [
    "creative",
    "storyteller",
    "funny",
    "playful",
  ],
  "The Quiet Observer": [
    "reserved-personality",
    "thoughtful",
    "quiet-conversationalist",
    "calm-presence",
  ],
  "The Ambitious Achiever": [
    "motivational-personality",
    "socially-confident",
    "reliable",
    "direct-speaker",
  ],
  "The Calm Harmonizer": [
    "diplomatic-speaker",
    "calm-presence",
    "emotionally-intelligent",
    "supportive",
  ],
};

export const PERSONALITY_SCORE_DIMENSIONS = {
  qp: { key: "qp", label: "Questionnaire Profile", weight: 0.2 },
  cq: { key: "cq", label: "Conversation Quality", weight: 0.25 },
  er: { key: "er", label: "Empathy & Respect", weight: 0.2 },
  rc: { key: "rc", label: "Reliability & Consistency", weight: 0.15 },
  cp: { key: "cp", label: "Community Participation", weight: 0.1 },
  gi: { key: "gi", label: "Growth & Improvement", weight: 0.1 },
} as const;

export type PersonalityScoreDimensionKey =
  keyof typeof PERSONALITY_SCORE_DIMENSIONS;

export const PERSONALITY_SCORE_BANDS = [
  {
    min: 0,
    max: 39,
    label: "Developing",
    description:
      "New or inconsistent profile; not enough positive interaction data yet.",
  },
  {
    min: 40,
    max: 59,
    label: "Emerging",
    description:
      "Developing social profile with mixed but improving interaction patterns.",
  },
  {
    min: 60,
    max: 74,
    label: "Positive",
    description:
      "Generally positive communicator with good compatibility indicators.",
  },
  {
    min: 75,
    max: 89,
    label: "Trusted",
    description:
      "Trusted and engaging presence with strong social reliability.",
  },
  {
    min: 90,
    max: 100,
    label: "Exceptional",
    description:
      "Exceptional conversational quality and community trust over time.",
  },
] as const;

export function getPersonalityScoreBand(score: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    PERSONALITY_SCORE_BANDS.find(
      (band) => clamped >= band.min && clamped <= band.max,
    ) ?? PERSONALITY_SCORE_BANDS[0]
  );
}

/** Maps legacy tag slugs to new catalog slugs for existing users. */
export const LEGACY_TAG_SLUG_MAP: Record<string, string> = {
  "analytical-thinker": "analytical",
  "warm-connector": "friendly",
  "reflective-soul": "thoughtful",
  "bold-initiator": "engaging-speaker",
  "gentle-presence": "supportive",
  "idea-explorer": "curious-mind",
  "steady-anchor": "reliable",
  "witty-spirit": "humor-driven",
  "deep-listener": "great-listener",
  "high-energy": "energetic",
};
