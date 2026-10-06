import { z } from "zod";
import { generateJson, type AiSource } from "@/lib/ai/provider";
import type { Locale } from "@/i18n/config";

export type ListingDraft = {
  title: string;
  summary: string;
  description: string;
  sector: string;
  jurisdiction: string;
  licenseType: string;
  dealType: string;
  askingPrice: number | null;
  currency: string;
  revenue: number | null;
  ebitda: number | null;
  employees: number | null;
  foundedYear: number | null;
  highlights: string[];
};

export type ListingReview = {
  score: number;
  issues: string[];
  suggestions: string[];
  suggestedSummary: string | null;
  source: AiSource;
};

type Rule = {
  weight: number;
  failed: (draft: ListingDraft) => boolean;
  issue: Record<Locale, string>;
  isSuggestion?: boolean;
};

/**
 * Rule-based listing review: the questions a buyer asks in the first call.
 * It runs on its own when AI is unavailable, and it is also the floor for the
 * AI review — the model may add nuance, but these gaps are always reported.
 */
const RULES: Rule[] = [
  {
    weight: 18,
    failed: (d) => d.description.trim().length < 200,
    issue: {
      en: "The description is too thin for a first screening — buyers need the business model, client base and reason for sale.",
      uk: "Опис занадто короткий для першого скринінгу — покупцям потрібні бізнес-модель, клієнтська база та причина продажу.",
    },
  },
  {
    weight: 14,
    failed: (d) => d.revenue === null,
    issue: {
      en: "Revenue is not disclosed. Listings without a revenue figure are usually skipped by funds.",
      uk: "Виручку не вказано. Лістинги без виручки фонди зазвичай пропускають.",
    },
  },
  {
    weight: 12,
    failed: (d) => d.ebitda === null,
    issue: {
      en: "EBITDA is missing, so buyers cannot sanity-check the asking price against earnings.",
      uk: "Немає EBITDA, тому покупці не можуть зіставити ціну з прибутком.",
    },
  },
  {
    weight: 10,
    failed: (d) => d.askingPrice === null,
    issue: {
      en: "No asking price. Expect fewer inbound requests — price filters will exclude this listing.",
      uk: "Немає запитуваної ціни. Запитів буде менше — фільтри за ціною виключать цей лістинг.",
    },
  },
  {
    weight: 10,
    failed: (d) => !d.licenseType || d.licenseType === "Unregulated",
    issue: {
      en: "No regulatory licence stated. If the perimeter includes one, name it — it is the strongest filter buyers use.",
      uk: "Не вказано ліцензію. Якщо вона входить у перимітр — назвіть її, це найсильніший фільтр покупців.",
    },
  },
  {
    weight: 8,
    failed: (d) => d.highlights.filter((h) => h.trim()).length < 3,
    issue: {
      en: "Add at least three highlights — they are the first thing read on the card.",
      uk: "Додайте щонайменше три ключові факти — саме їх читають першими на картці.",
    },
    isSuggestion: true,
  },
  {
    weight: 6,
    failed: (d) => d.summary.trim().length < 40,
    issue: {
      en: "The one-line summary is too short to say what is being sold.",
      uk: "Короткий опис занадто стислий, щоб зрозуміти, що саме продається.",
    },
    isSuggestion: true,
  },
  {
    weight: 6,
    failed: (d) => d.employees === null,
    issue: {
      en: "Headcount is missing — it signals whether the team transfers with the deal.",
      uk: "Не вказано кількість працівників — це показує, чи команда переходить разом з угодою.",
    },
    isSuggestion: true,
  },
  {
    weight: 6,
    failed: (d) => d.foundedYear === null,
    issue: {
      en: "Founding year is missing — track record matters for licensed entities.",
      uk: "Не вказано рік заснування — для ліцензованих компаній історія важлива.",
    },
    isSuggestion: true,
  },
];

export function reviewListingDeterministic(draft: ListingDraft, locale: Locale): ListingReview {
  const failures = RULES.filter((rule) => rule.failed(draft));
  const penalty = failures.reduce((sum, rule) => sum + rule.weight, 0);

  return {
    score: Math.max(0, 100 - penalty),
    issues: failures.filter((r) => !r.isSuggestion).map((r) => r.issue[locale]),
    suggestions: failures.filter((r) => r.isSuggestion).map((r) => r.issue[locale]),
    suggestedSummary: null,
    source: "heuristic",
  };
}

const aiSchema = z.object({
  score: z.number(),
  issues: z.array(z.string()).max(6).optional().default([]),
  suggestions: z.array(z.string()).max(6).optional().default([]),
  suggestedSummary: z.string().optional().default(""),
});

const SYSTEM = `You are an M&A analyst reviewing a marketplace listing for a licensed financial business before it goes live.
Judge it the way a professional buyer would screen it in 30 seconds.
- "issues": concrete missing facts or red flags that would stop a buyer, hardest first.
- "suggestions": smaller improvements to wording or structure.
- "suggestedSummary": a sharper one-line summary (max 140 characters) built ONLY from facts present in the listing. Never invent numbers.
- "score": 0-100 readiness. Deduct hard for missing financials, thin description or an unstated licence.
Be specific and terse. No pleasantries, no markdown.`;

export async function reviewListing(draft: ListingDraft, locale: Locale): Promise<ListingReview> {
  const deterministic = reviewListingDeterministic(draft, locale);

  const result = await generateJson({
    system: SYSTEM,
    temperature: 0.3,
    prompt: [
      `Answer in ${locale === "uk" ? "Ukrainian" : "English"}.`,
      "",
      "Listing:",
      JSON.stringify(draft, null, 2),
      "",
      "Checks that already failed deterministically (do not repeat them verbatim, but stay consistent):",
      [...deterministic.issues, ...deterministic.suggestions].map((i) => `- ${i}`).join("\n") || "- none",
    ].join("\n"),
    schema: aiSchema,
    responseSchema: {
      type: "object",
      properties: {
        score: { type: "integer" },
        issues: { type: "array", items: { type: "string" } },
        suggestions: { type: "array", items: { type: "string" } },
        suggestedSummary: { type: "string" },
      },
      required: ["score", "issues", "suggestions"],
    },
  });

  if (!result.ok) return deterministic;

  const { score, issues, suggestions, suggestedSummary } = result.data;
  return {
    // The model is allowed to be stricter than the rules, never more lenient:
    // a listing missing its financials must not score 90 because it reads well.
    score: Math.round(Math.max(0, Math.min(deterministic.score, score))),
    issues: dedupe([...deterministic.issues, ...issues]).slice(0, 6),
    suggestions: dedupe([...deterministic.suggestions, ...suggestions]).slice(0, 6),
    suggestedSummary: suggestedSummary.trim() ? suggestedSummary.trim().slice(0, 180) : null,
    source: "ai",
  };
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
