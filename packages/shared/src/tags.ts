import { TagCategory } from "./enums";

export interface TagDefinition {
  slug: string;
  label: string;
  category: TagCategory;
  description: string;
}

function tag(
  slug: string,
  label: string,
  category: TagCategory,
  description: string,
): TagDefinition {
  return { slug, label, category, description };
}

/**
 * Public tag catalog. Only positive or neutral framing — never punitive.
 */
export const TAG_CATALOG: TagDefinition[] = [
  // Communication style
  tag("calm-communicator", "Calm Communicator", TagCategory.STYLE, "Steady, measured conversational style."),
  tag("expressive-communicator", "Expressive Communicator", TagCategory.STYLE, "Animated and emotionally expressive."),
  tag("direct-speaker", "Direct Speaker", TagCategory.STYLE, "Clear and to the point."),
  tag("diplomatic-speaker", "Diplomatic Speaker", TagCategory.STYLE, "Tactful and considerate in tone."),
  tag("storyteller", "Storyteller", TagCategory.STYLE, "Brings narratives and vivid examples."),
  tag("quiet-conversationalist", "Quiet Conversationalist", TagCategory.STYLE, "Reserved; listens more than speaks."),
  tag("debate-oriented", "Debate-Oriented", TagCategory.STYLE, "Enjoys spirited, respectful disagreement."),
  tag("engaging-speaker", "Engaging Speaker", TagCategory.STYLE, "Keeps conversations lively and moving."),
  tag("thoughtful-responder", "Thoughtful Responder", TagCategory.STYLE, "Responds with care and reflection."),
  tag("selective-responder", "Selective Responder", TagCategory.STYLE, "Speaks when they have something meaningful to add."),

  // Emotional intelligence & social energy
  tag("empathetic", "Empathetic", TagCategory.EMOTIONAL, "Tunes in to how others are feeling."),
  tag("emotionally-intelligent", "Emotionally Intelligent", TagCategory.EMOTIONAL, "Reads emotional cues well."),
  tag("great-listener", "Great Listener", TagCategory.SOCIAL, "Lets others feel heard."),
  tag("supportive", "Supportive", TagCategory.EMOTIONAL, "Encouraging and emotionally supportive."),
  tag("encouraging", "Encouraging", TagCategory.EMOTIONAL, "Uplifts others in conversation."),
  tag("calm-presence", "Calm Presence", TagCategory.EMOTIONAL, "Brings a peaceful, steady energy."),
  tag("friendly", "Friendly", TagCategory.SOCIAL, "Approachable and warm."),
  tag("easy-to-talk-to", "Easy To Talk To", TagCategory.SOCIAL, "Makes conversation feel effortless."),
  tag("energetic", "Energetic", TagCategory.SOCIAL, "Brings momentum and enthusiasm."),
  tag("socially-confident", "Socially Confident", TagCategory.SOCIAL, "Comfortable initiating and leading chat."),

  // Intellectual & curiosity
  tag("analytical", "Analytical", TagCategory.INTELLECTUAL, "Approaches ideas logically."),
  tag("deep-thinker", "Deep Thinker", TagCategory.INTELLECTUAL, "Brings depth and reflection."),
  tag("insightful", "Insightful", TagCategory.INTELLECTUAL, "Offers meaningful perspectives."),
  tag("curious-mind", "Curious Mind", TagCategory.INTELLECTUAL, "Asks meaningful questions."),
  tag("intellectually-curious", "Intellectually Curious", TagCategory.INTELLECTUAL, "Loves exploring ideas."),
  tag("open-minded", "Open-Minded", TagCategory.INTELLECTUAL, "Receptive to different viewpoints."),
  tag("independent-thinker", "Independent Thinker", TagCategory.INTELLECTUAL, "Forms their own considered views."),
  tag("idea-driven", "Idea-Driven", TagCategory.INTELLECTUAL, "Energized by concepts and theories."),
  tag("philosophical", "Philosophical", TagCategory.INTELLECTUAL, "Enjoys big-picture questions."),
  tag("observant", "Observant", TagCategory.INTELLECTUAL, "Notices subtle details in conversation."),

  // Reliability & trust
  tag("reliable", "Reliable", TagCategory.TRUST, "Shows up consistently."),
  tag("consistent", "Consistent", TagCategory.TRUST, "Steady behavior over time."),
  tag("trusted-member", "Trusted Member", TagCategory.TRUST, "Earned community trust."),
  tag("genuine", "Genuine", TagCategory.TRUST, "Authentic and honest."),
  tag("respectful", "Respectful", TagCategory.TRUST, "Consistently respectful in conversations."),
  tag("mature-conversationalist", "Mature Conversationalist", TagCategory.TRUST, "Handles conversations with maturity."),
  tag("boundary-aware", "Boundary-Aware", TagCategory.TRUST, "Respects personal limits."),
  tag("positive-presence", "Positive Presence", TagCategory.TRUST, "Leaves interactions feeling better."),
  tag("long-term-connector", "Long-Term Connector", TagCategory.TRUST, "People want to stay in touch."),
  tag("responsive", "Responsive", TagCategory.TRUST, "Replies reliably in conversations."),

  // Creativity & fun
  tag("creative", "Creative", TagCategory.FUN, "Imaginative and original."),
  tag("funny", "Funny", TagCategory.FUN, "Brings humor and lightness."),
  tag("playful", "Playful", TagCategory.FUN, "Energetic and playful in tone."),
  tag("imaginative", "Imaginative", TagCategory.FUN, "Thinks outside the box."),
  tag("adventurous", "Adventurous", TagCategory.FUN, "Open to new experiences."),
  tag("spontaneous", "Spontaneous", TagCategory.FUN, "Flexible and improvisational."),
  tag("high-energy-conversationalist", "High-Energy Conversationalist", TagCategory.FUN, "High tempo and enthusiasm."),
  tag("humor-driven", "Humor-Driven", TagCategory.FUN, "Uses humor to connect."),

  // Compatibility signals
  tag("introvert-friendly", "Introvert-Friendly", TagCategory.COMPATIBILITY, "Comfortable with quieter exchanges."),
  tag("extrovert-friendly", "Extrovert-Friendly", TagCategory.COMPATIBILITY, "Matches high social energy well."),
  tag("deep-conversation-lover", "Deep Conversation Lover", TagCategory.COMPATIBILITY, "Prefers meaningful depth."),
  tag("casual-conversationalist", "Casual Conversationalist", TagCategory.COMPATIBILITY, "Enjoys light, easy chat."),
  tag("emotional-support-personality", "Emotional Support Personality", TagCategory.COMPATIBILITY, "Offers comfort naturally."),
  tag("intellectual-explorer", "Intellectual Explorer", TagCategory.COMPATIBILITY, "Best with idea-focused partners."),
  tag("creative-personality", "Creative Personality", TagCategory.COMPATIBILITY, "Pairs well with imaginative people."),
  tag("motivational-personality", "Motivational Personality", TagCategory.COMPATIBILITY, "Inspires progress and action."),
  tag("calm-listener", "Calm Listener", TagCategory.COMPATIBILITY, "Steady, patient listening style."),
  tag("debate-lover", "Debate Lover", TagCategory.COMPATIBILITY, "Enjoys intellectual sparring."),

  // Neutral / descriptive
  tag("reserved-personality", "Reserved Personality", TagCategory.NEUTRAL, "Quiet until they know you."),
  tag("opinionated", "Opinionated", TagCategory.NEUTRAL, "Holds clear views and shares them."),
  tag("highly-analytical", "Highly Analytical", TagCategory.NEUTRAL, "Strongly logic-oriented."),
  tag("independent", "Independent", TagCategory.NEUTRAL, "Values personal freedom in social life."),
  tag("private-person", "Private Person", TagCategory.NEUTRAL, "Keeps personal details selective."),
  tag("reflective", "Reflective", TagCategory.NEUTRAL, "Thinks before speaking."),
  tag("practical-thinker", "Practical Thinker", TagCategory.NEUTRAL, "Focuses on concrete solutions."),
  tag("emotionally-reserved", "Emotionally Reserved", TagCategory.NEUTRAL, "Expresses feelings selectively."),
  tag("fast-paced-conversationalist", "Fast-Paced Conversationalist", TagCategory.NEUTRAL, "Quick, energetic rhythm."),
  tag("detail-oriented", "Detail-Oriented", TagCategory.NEUTRAL, "Attentive to specifics."),

  // Legacy aliases kept for backward compatibility during migration
  tag("thoughtful", "Thoughtful", TagCategory.INTELLECTUAL, "Considers ideas carefully before responding."),
];

export const TAG_BY_SLUG = Object.fromEntries(
  TAG_CATALOG.map((t) => [t.slug, t] as const),
);
