const ADJECTIVES = [
  "Calm",
  "Quiet",
  "Curious",
  "Bright",
  "Warm",
  "Kind",
  "Witty",
  "Gentle",
  "Bold",
  "Thoughtful",
  "Mellow",
  "Eager",
];

const NOUNS = [
  "Owl",
  "River",
  "Comet",
  "Ember",
  "Willow",
  "Falcon",
  "Lantern",
  "Maple",
  "Harbor",
  "Sparrow",
  "Drift",
  "Echo",
];

export function generatePreviewAlias(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}${noun}_${num}`;
}
