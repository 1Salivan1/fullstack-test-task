import { z } from "zod";
import { generateJson, type AiSource } from "@/lib/ai/provider";
import type { Locale } from "@/i18n/config";

export type MatchCandidateInput = {
  id: string;
  /** Deterministic score from src/lib/matching/score.ts (0-100). */
  baseScore: number;
  /** Compact, factual description of the candidate for the prompt. */
  profile: string;
};

export type MatchRationale = {
  score: number;
  reason: string | null;
};

export type MatchRationales = {
  byId: Record<string, MatchRationale>;
  source: AiSource;
};

const aiSchema = z.object({
  matches: z
    .array(
      z.object({
        id: z.string(),
        score: z.number(),
        reason: z.string(),
      }),
    )
    .default([]),
});

const SYSTEM = `You rank counterparties on an M&A marketplace for licensed financial businesses.
For each candidate return:
- "score": 0-100 fit with the subject, judged on sector, geography, deal structure, size and stated intent.
- "reason": ONE sentence (max 160 chars) naming the concrete reason for the fit or the single biggest obstacle. Cite facts from the data, never invent any.
Return every candidate id you were given, no extras.`;

/**
 * Asks the model to score a shortlist that the deterministic engine already
 * produced. The final ranking blends both (60% deterministic / 40% model), so
 * the ordering stays explainable and cannot be dominated by a hallucination,
 * while the model still contributes judgement the rules cannot express.
 */
export async function explainMatches(args: {
  subject: string;
  candidates: MatchCandidateInput[];
  locale: Locale;
}): Promise<MatchRationales> {
  const fallback: MatchRationales = {
    byId: Object.fromEntries(
      args.candidates.map((c) => [c.id, { score: c.baseScore, reason: null }]),
    ),
    source: "heuristic",
  };

  if (args.candidates.length === 0) return fallback;

  const result = await generateJson({
    system: SYSTEM,
    temperature: 0.3,
    prompt: [
      `Write every "reason" in ${args.locale === "uk" ? "Ukrainian" : "English"}.`,
      "",
      "Subject:",
      args.subject,
      "",
      "Candidates:",
      ...args.candidates.map((c) => `- id=${c.id} | rule-based fit ${c.baseScore}/100 | ${c.profile}`),
    ].join("\n"),
    schema: aiSchema,
    responseSchema: {
      type: "object",
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              score: { type: "integer" },
              reason: { type: "string" },
            },
            required: ["id", "score", "reason"],
          },
        },
      },
      required: ["matches"],
    },
  });

  if (!result.ok) return fallback;

  const byId: Record<string, MatchRationale> = { ...fallback.byId };
  for (const match of result.data.matches) {
    const candidate = args.candidates.find((c) => c.id === match.id);
    if (!candidate) continue; // ignore ids the model invented
    const aiScore = Math.max(0, Math.min(100, match.score));
    byId[match.id] = {
      score: Math.round(candidate.baseScore * 0.6 + aiScore * 0.4),
      reason: match.reason.trim().slice(0, 200) || null,
    };
  }

  return { byId, source: "ai" };
}
