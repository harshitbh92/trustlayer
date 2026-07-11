import { Injectable, Logger } from "@nestjs/common";
import {
  AI_ALLOWED_TAG_SLUGS,
  proposeTagsHeuristically,
  validateAndNormalizeTagProposals,
  type AiAssistContext,
  type AiTagProposal,
  type FeedbackForTags,
} from "@trustlayer/reputation-engine";

@Injectable()
export class AiReputationAssistService {
  private readonly logger = new Logger(AiReputationAssistService.name);

  isLlmEnabled() {
    return (
      process.env.REPUTATION_AI_ENABLED === "true" &&
      Boolean(process.env.OPENAI_API_KEY?.trim())
    );
  }

  /**
   * Returns validated AI tag proposals.
   * Always includes heuristic proposals; optionally merges LLM proposals.
   */
  async proposeTags(
    feedback: FeedbackForTags,
    context: AiAssistContext = {},
  ): Promise<AiTagProposal[]> {
    const heuristic = proposeTagsHeuristically(feedback, context);

    if (!this.isLlmEnabled()) {
      return validateAndNormalizeTagProposals(heuristic);
    }

    try {
      const llm = await this.proposeWithOpenAi(feedback, context);
      return validateAndNormalizeTagProposals([...heuristic, ...llm]);
    } catch (error) {
      this.logger.warn(
        `LLM reputation assist failed; using heuristic only: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return validateAndNormalizeTagProposals(heuristic);
    }
  }

  private async proposeWithOpenAi(
    feedback: FeedbackForTags,
    context: AiAssistContext,
  ): Promise<AiTagProposal[]> {
    const apiKey = process.env.OPENAI_API_KEY!.trim();
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    const catalog = AI_ALLOWED_TAG_SLUGS.slice(0, 80).join(", ");
    const snippets = (context.messageSnippets ?? [])
      .slice(0, 8)
      .map((s) => s.slice(0, 180));

    const userPayload = {
      feedback,
      overallFeeling: context.overallFeeling ?? null,
      mood: context.mood ?? null,
      topic: context.topic ?? null,
      messageSnippets: snippets,
      instruction:
        "Propose up to 3 positive/neutral reputation tags that fit this interaction. Only use slugs from the allowed list. Return JSON only.",
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You assist TrustLayer reputation tagging.",
              "Never invent punitive or insulting tags.",
              "Only choose from this allowed slug list:",
              catalog,
              'Respond with JSON: {"tags":[{"slug":"...","confidence":0.0,"reason":"..."}]}',
              "confidence must be 0-1. Max 3 tags. If feedback is weak/negative, return {\"tags\":[]}.",
            ].join("\n"),
          },
          {
            role: "user",
            content: JSON.stringify(userPayload),
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      tags?: { slug?: string; confidence?: number; reason?: string }[];
    };

    return (parsed.tags ?? []).map((t) => ({
      slug: String(t.slug ?? ""),
      confidence: Number(t.confidence) || 0,
      reason: t.reason,
    }));
  }
}
