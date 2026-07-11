import { TAG_BY_SLUG, TAG_CATALOG, TagCategory } from "@trustlayer/shared";
import { tagsFromFeedback, type FeedbackForTags, type TagAssignment } from "./tags";

export interface AiTagProposal {
  slug: string;
  /** 0–1 model/heuristic confidence */
  confidence: number;
  reason?: string;
}

export interface AiAssistContext {
  overallFeeling?: string;
  mood?: string | null;
  topic?: string | null;
  /** Optional short conversation excerpts for LLM assist */
  messageSnippets?: string[];
}

export interface MergeTagOptions {
  /** Max strength applied from AI-only tags (default 0.1) */
  aiStrengthScale?: number;
  /** Max AI tags to accept after validation (default 3) */
  maxAiTags?: number;
  /** Minimum confidence to accept an AI proposal (default 0.55) */
  minConfidence?: number;
}

const ALLOWED_AI_CATEGORIES = new Set<string>([
  TagCategory.TRUST,
  TagCategory.SOCIAL,
  TagCategory.INTELLECTUAL,
  TagCategory.FUN,
  TagCategory.EMOTIONAL,
  TagCategory.STYLE,
  TagCategory.COMPATIBILITY,
  TagCategory.NEUTRAL,
]);

/** Public catalog slugs the AI may propose (never invent outside this set). */
export const AI_ALLOWED_TAG_SLUGS = TAG_CATALOG
  .filter((t) => ALLOWED_AI_CATEGORIES.has(t.category))
  .map((t) => t.slug);

const ALLOWED_SET = new Set(AI_ALLOWED_TAG_SLUGS);

/**
 * Deterministic “smart” proposer — runs without an external LLM.
 * Looks at feedback patterns + overall feeling for tags the basic
 * rule table may under-award.
 */
export function proposeTagsHeuristically(
  feedback: FeedbackForTags,
  context: AiAssistContext = {},
): AiTagProposal[] {
  const avg =
    (feedback.feltRespected +
      feedback.feltComfortable +
      feedback.wasEngaging +
      feedback.conversationDepth +
      feedback.wouldReconnect +
      feedback.feltNatural) /
    6;

  // Do not boost reputation on weak / negative sessions.
  if (avg < 3.5) return [];
  if (
    context.overallFeeling === "drained" ||
    context.overallFeeling === "uneasy"
  ) {
    return [];
  }

  const out: AiTagProposal[] = [];
  const push = (slug: string, confidence: number, reason: string) => {
    if (!ALLOWED_SET.has(slug)) return;
    out.push({ slug, confidence: clamp01(confidence), reason });
  };

  const feeling = context.overallFeeling ?? "";

  if (feedback.feltRespected >= 4 && feedback.feltComfortable >= 4) {
    push("calm-presence", 0.62, "Respect + comfort signal a calm presence");
  }
  if (feedback.feltComfortable >= 5 && feedback.feltNatural >= 4) {
    push("friendly", 0.68, "High comfort and natural flow");
  }
  if (feedback.wasEngaging >= 5 && feedback.feltNatural >= 4) {
    push("socially-confident", 0.65, "Highly engaging and natural");
  }
  if (feedback.conversationDepth >= 5 && feedback.wasEngaging >= 4) {
    push("curious-mind", 0.7, "Deep and engaging exchange");
    push("philosophical", 0.58, "Very high depth rating");
  }
  if (feedback.wouldReconnect >= 5 && feedback.feltRespected >= 4) {
    push("genuine", 0.66, "Strong reconnect + respect");
    push("mature-conversationalist", 0.6, "Reconnect-worthy maturity");
  }
  if (
    feedback.feltRespected >= 4 &&
    feedback.feltComfortable >= 4 &&
    feedback.feltNatural >= 4
  ) {
    push("empathetic", 0.64, "Safe, respectful, natural conversation");
  }
  if (feedback.wasEngaging >= 4 && feedback.conversationDepth <= 2) {
    push("playful", 0.57, "Engaging but light / casual");
    push("casual-conversationalist", 0.6, "Light engaging chat");
  }
  if (feedback.conversationDepth >= 4 && feedback.feltComfortable >= 4) {
    push("emotional-support-personality", 0.58, "Depth with emotional safety");
  }
  if (feeling === "uplifted") {
    push("encouraging", 0.72, "Partner left feeling uplifted");
    push("positive-presence", 0.7, "Uplifting overall feeling");
    push("funny", 0.55, "Uplifted often correlates with humor");
  }
  if (feeling === "comfortable") {
    push("easy-to-talk-to", 0.7, "Overall comfortable feeling");
    push("supportive", 0.62, "Comfortable overall tone");
  }

  const topic = (context.topic ?? "").toLowerCase();
  const mood = (context.mood ?? "").toLowerCase();
  if (topic.includes("idea") || topic.includes("debate") || topic.includes("tech")) {
    push("analytical", 0.6, "Topic leans intellectual");
    push("idea-driven", 0.58, "Idea-focused topic");
  }
  if (mood.includes("fun") || mood.includes("play") || mood.includes("light")) {
    push("humor-driven", 0.6, "Fun / playful mood");
  }
  if (mood.includes("deep") || mood.includes("serious")) {
    push("deep-thinker", 0.63, "Deep mood preference");
  }

  // Dedupe keeping highest confidence
  const bySlug = new Map<string, AiTagProposal>();
  for (const p of out) {
    const prev = bySlug.get(p.slug);
    if (!prev || p.confidence > prev.confidence) bySlug.set(p.slug, p);
  }

  return [...bySlug.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Validate external (LLM) proposals: catalog-only, confidence floor, max count.
 */
export function validateAndNormalizeTagProposals(
  proposals: AiTagProposal[],
  options: MergeTagOptions = {},
): AiTagProposal[] {
  const minConfidence = options.minConfidence ?? 0.55;
  const maxAiTags = options.maxAiTags ?? 3;

  const cleaned: AiTagProposal[] = [];
  const seen = new Set<string>();

  for (const raw of proposals) {
    const slug = String(raw.slug ?? "")
      .trim()
      .toLowerCase();
    if (!slug || seen.has(slug)) continue;
    if (!ALLOWED_SET.has(slug) || !TAG_BY_SLUG[slug]) continue;

    const confidence = clamp01(Number(raw.confidence) || 0);
    if (confidence < minConfidence) continue;

    seen.add(slug);
    cleaned.push({
      slug,
      confidence,
      reason: raw.reason?.slice(0, 200),
    });
  }

  return cleaned
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxAiTags);
}

/**
 * Merge rule-based tags with AI proposals.
 * AI never invents slugs; AI-only tags get scaled-down strength.
 * Shared slugs keep the stronger of rule delta vs AI-scaled delta.
 */
export function mergeTagAssignments(
  ruleTags: TagAssignment[],
  aiProposals: AiTagProposal[],
  options: MergeTagOptions = {},
): {
  merged: TagAssignment[];
  fromRules: string[];
  fromAi: string[];
} {
  const aiStrengthScale = options.aiStrengthScale ?? 0.1;
  const validated = validateAndNormalizeTagProposals(aiProposals, options);

  const bySlug = new Map<string, number>();
  for (const t of ruleTags) {
    if (!TAG_BY_SLUG[t.slug]) continue;
    bySlug.set(t.slug, Math.max(bySlug.get(t.slug) ?? 0, t.strengthDelta));
  }

  const fromRules = [...bySlug.keys()];
  const fromAi: string[] = [];

  for (const p of validated) {
    const aiDelta = clamp01(p.confidence) * aiStrengthScale;
    const existing = bySlug.get(p.slug) ?? 0;
    if (!fromRules.includes(p.slug)) fromAi.push(p.slug);
    bySlug.set(p.slug, Math.max(existing, aiDelta));
  }

  const merged = [...bySlug.entries()].map(([slug, strengthDelta]) => ({
    slug,
    strengthDelta,
  }));

  return { merged, fromRules, fromAi };
}

/**
 * Full assist pipeline used by the API (heuristic always; LLM proposals optional).
 */
export function assistTagAwards(
  feedback: FeedbackForTags,
  context: AiAssistContext = {},
  llmProposals: AiTagProposal[] = [],
  ruleTags?: TagAssignment[],
): {
  merged: TagAssignment[];
  fromRules: string[];
  fromAi: string[];
  heuristicProposals: AiTagProposal[];
} {
  const rules = ruleTags ?? tagsFromFeedback(feedback);
  const heuristic = proposeTagsHeuristically(feedback, context);
  const combinedProposals = [...heuristic, ...llmProposals];

  const result = mergeTagAssignments(rules, combinedProposals);
  return {
    ...result,
    heuristicProposals: heuristic,
  };
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
