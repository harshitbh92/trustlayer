import { TagCategory } from "./enums";

export interface TagDefinition {
  slug: string;
  label: string;
  category: TagCategory;
  description: string;
}

/**
 * Public tag catalog. Only positive or neutral framing — never punitive.
 * Negative moderation signals live in internal tables (reports, moderation
 * actions) and are never surfaced on profiles.
 */
export const TAG_CATALOG: TagDefinition[] = [
  {
    slug: "respectful",
    label: "Respectful",
    category: TagCategory.TRUST,
    description: "Consistently respectful in conversations.",
  },
  {
    slug: "great-listener",
    label: "Great Listener",
    category: TagCategory.SOCIAL,
    description: "Listens attentively and lets others feel heard.",
  },
  {
    slug: "friendly",
    label: "Friendly",
    category: TagCategory.SOCIAL,
    description: "Approachable and warm in interactions.",
  },
  {
    slug: "supportive",
    label: "Supportive",
    category: TagCategory.EMOTIONAL,
    description: "Encouraging and emotionally supportive.",
  },
  {
    slug: "empathetic",
    label: "Empathetic",
    category: TagCategory.EMOTIONAL,
    description: "Tunes in to how others are feeling.",
  },
  {
    slug: "thoughtful",
    label: "Thoughtful",
    category: TagCategory.INTELLECTUAL,
    description: "Considers ideas carefully before responding.",
  },
  {
    slug: "curious-mind",
    label: "Curious Mind",
    category: TagCategory.INTELLECTUAL,
    description: "Asks meaningful questions, explores ideas.",
  },
  {
    slug: "deep-thinker",
    label: "Deep Thinker",
    category: TagCategory.INTELLECTUAL,
    description: "Brings depth and reflection to discussions.",
  },
  {
    slug: "funny",
    label: "Funny",
    category: TagCategory.FUN,
    description: "Brings humor and lightness to conversations.",
  },
  {
    slug: "playful",
    label: "Playful",
    category: TagCategory.FUN,
    description: "Energetic and playful in tone.",
  },
  {
    slug: "genuine",
    label: "Genuine",
    category: TagCategory.TRUST,
    description: "Authentic and honest in interactions.",
  },
  {
    slug: "reliable",
    label: "Reliable",
    category: TagCategory.TRUST,
    description: "Shows up consistently in conversations.",
  },
  {
    slug: "easy-to-talk-to",
    label: "Easy To Talk To",
    category: TagCategory.SOCIAL,
    description: "Makes conversation feel effortless.",
  },
  // Neutral style tags (never punitive)
  {
    slug: "calm-communicator",
    label: "Calm Communicator",
    category: TagCategory.STYLE,
    description: "Steady, measured conversational style.",
  },
  {
    slug: "expressive-communicator",
    label: "Expressive Communicator",
    category: TagCategory.STYLE,
    description: "Animated, emotionally expressive style.",
  },
  {
    slug: "direct-speaker",
    label: "Direct Speaker",
    category: TagCategory.STYLE,
    description: "Clear and to the point.",
  },
  {
    slug: "quiet-conversationalist",
    label: "Quiet Conversationalist",
    category: TagCategory.STYLE,
    description: "Reserved, listens more than speaks.",
  },
  {
    slug: "analytical-thinker",
    label: "Analytical Thinker",
    category: TagCategory.STYLE,
    description: "Approaches conversations analytically.",
  },
  {
    slug: "introvert-friendly",
    label: "Introvert-friendly",
    category: TagCategory.STYLE,
    description: "Comfortable with quieter, deeper exchanges.",
  },
  {
    slug: "high-energy",
    label: "High-energy Conversationalist",
    category: TagCategory.STYLE,
    description: "Brings energy and momentum.",
  },
  {
    slug: "warm-connector",
    label: "Warm Connector",
    category: TagCategory.SOCIAL,
    description: "Builds rapport quickly and warmly.",
  },
  {
    slug: "reflective-soul",
    label: "Reflective Soul",
    category: TagCategory.STYLE,
    description: "Thoughtful and measured in conversation.",
  },
  {
    slug: "bold-initiator",
    label: "Bold Initiator",
    category: TagCategory.SOCIAL,
    description: "Starts conversations with confidence.",
  },
  {
    slug: "gentle-presence",
    label: "Gentle Presence",
    category: TagCategory.EMOTIONAL,
    description: "Creates a soft, welcoming conversational space.",
  },
  {
    slug: "idea-explorer",
    label: "Idea Explorer",
    category: TagCategory.INTELLECTUAL,
    description: "Loves exploring new ideas with others.",
  },
  {
    slug: "steady-anchor",
    label: "Steady Anchor",
    category: TagCategory.TRUST,
    description: "Grounded and consistent in how they show up.",
  },
  {
    slug: "witty-spirit",
    label: "Witty Spirit",
    category: TagCategory.FUN,
    description: "Brings clever humor into conversations.",
  },
  {
    slug: "deep-listener",
    label: "Deep Listener",
    category: TagCategory.SOCIAL,
    description: "Goes beneath the surface when listening.",
  },
];

export const TAG_BY_SLUG = Object.fromEntries(
  TAG_CATALOG.map((t) => [t.slug, t] as const),
);
