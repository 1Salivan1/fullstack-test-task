import { DealType } from "@prisma/client";
import { z } from "zod";
import {
  DEAL_TYPES,
  DEAL_TYPE_ALIASES,
  JURISDICTIONS,
  JURISDICTION_ALIASES,
  LICENSE_ALIASES,
  LICENSE_TYPES,
  SECTORS,
  SECTOR_ALIASES,
  containsTerm,
  findInVocabulary,
  keepKnown,
  type Jurisdiction,
  type LicenseType,
  type Sector,
} from "@/lib/taxonomy";
import { generateJson, type AiSource } from "@/lib/ai/provider";

export type ParsedAssetQuery = {
  q: string;
  sectors: Sector[];
  jurisdictions: Jurisdiction[];
  licenses: LicenseType[];
  dealTypes: DealType[];
  priceMin: number | null;
  priceMax: number | null;
};

const EMPTY: ParsedAssetQuery = {
  q: "",
  sectors: [],
  jurisdictions: [],
  licenses: [],
  dealTypes: [],
  priceMin: null,
  priceMax: null,
};

const SUFFIXES: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  m: 1_000_000,
  mln: 1_000_000,
  million: 1_000_000,
  млн: 1_000_000,
  bn: 1_000_000_000,
  billion: 1_000_000_000,
};

/** "€2.5M" -> 2500000, "800k" -> 800000, "1 200 000" -> 1200000. */
export function parseAmount(raw: string): number | null {
  const match = raw
    .toLowerCase()
    .replace(/[\s ]/g, "")
    .match(/([0-9]+(?:[.,][0-9]+)?)(k|thousand|mln|m|million|млн|bn|billion)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[1]!.replace(",", "."));
  if (!Number.isFinite(value)) return null;
  const multiplier = match[2] ? (SUFFIXES[match[2]] ?? 1) : 1;
  return Math.round(value * multiplier);
}

const AMOUNT = "([€$£]?\\s?[0-9][0-9\\s.,]*\\s?(?:k|m|mln|million|млн|bn|billion)?)";
const UPPER_BOUND = new RegExp(`(?:under|below|up to|less than|max(?:imum)?|cheaper than|<)\\s*${AMOUNT}`, "i");
const LOWER_BOUND = new RegExp(`(?:over|above|at least|from|more than|min(?:imum)?|>)\\s*${AMOUNT}`, "i");
const RANGE = new RegExp(`(?:between|from)\\s*${AMOUNT}\\s*(?:and|-|–|to)\\s*${AMOUNT}`, "i");

/**
 * Deterministic natural-language parser. It is the fallback when Gemini is not
 * configured or fails, and it is also the safety net that keeps AI output on the
 * taxonomy: anything the model invents is dropped by `keepKnown`.
 */
export function heuristicParse(text: string): ParsedAssetQuery {
  if (!text.trim()) return { ...EMPTY };

  const sectors = findInVocabulary(SECTORS, text, SECTOR_ALIASES);
  const jurisdictions = findInVocabulary(JURISDICTIONS, text, JURISDICTION_ALIASES);
  const licenses = findInVocabulary(LICENSE_TYPES, text, LICENSE_ALIASES);

  const dealTypes: DealType[] = [];
  for (const [alias, dealType] of Object.entries(DEAL_TYPE_ALIASES)) {
    if (containsTerm(text, alias) && !dealTypes.includes(dealType)) dealTypes.push(dealType);
  }

  let priceMin: number | null = null;
  let priceMax: number | null = null;

  const range = text.match(RANGE);
  if (range) {
    priceMin = parseAmount(range[1]!);
    priceMax = parseAmount(range[2]!);
  } else {
    const upper = text.match(UPPER_BOUND);
    if (upper) priceMax = parseAmount(upper[1]!);
    const lower = text.match(LOWER_BOUND);
    if (lower) priceMin = parseAmount(lower[1]!);
  }

  // Keep the free-text query only when nothing structured was recognised,
  // otherwise the literal phrase would over-constrain the SQL LIKE search.
  const structured =
    sectors.length || jurisdictions.length || licenses.length || dealTypes.length || priceMin || priceMax;

  return {
    q: structured ? "" : text.trim().slice(0, 120),
    sectors,
    jurisdictions,
    licenses,
    dealTypes,
    priceMin,
    priceMax,
  };
}

const aiSchema = z.object({
  keywords: z.string().optional().default(""),
  sectors: z.array(z.string()).optional().default([]),
  jurisdictions: z.array(z.string()).optional().default([]),
  licenses: z.array(z.string()).optional().default([]),
  dealTypes: z.array(z.string()).optional().default([]),
  priceMin: z.number().nullable().optional().default(null),
  priceMax: z.number().nullable().optional().default(null),
});

const SYSTEM = `You translate a marketplace visitor's free-text request into structured filters for an M&A marketplace of licensed financial businesses.
Rules:
- Only use values from the provided vocabularies, verbatim. If nothing fits, return an empty array.
- Money values are whole units of the listing currency (EUR), never text: "2.5M" -> 2500000.
- "keywords" holds at most 4 words that are NOT already expressed by another field (e.g. "profitable", "SEPA"). Leave it empty when the request is fully covered by the structured fields.
- Never invent constraints the user did not express.`;

export async function interpretAssetQuery(
  text: string,
): Promise<{ filters: ParsedAssetQuery; source: AiSource }> {
  const heuristic = heuristicParse(text);
  if (!text.trim()) return { filters: heuristic, source: "heuristic" };

  const result = await generateJson({
    system: SYSTEM,
    temperature: 0,
    prompt: [
      `Request: """${text.slice(0, 500)}"""`,
      "",
      `Sectors: ${SECTORS.join(" | ")}`,
      `Jurisdictions: ${JURISDICTIONS.join(" | ")}`,
      `Licences: ${LICENSE_TYPES.join(" | ")}`,
      `Deal types: ${DEAL_TYPES.join(" | ")}`,
    ].join("\n"),
    schema: aiSchema,
    responseSchema: {
      type: "object",
      properties: {
        keywords: { type: "string" },
        sectors: { type: "array", items: { type: "string", enum: [...SECTORS] } },
        jurisdictions: { type: "array", items: { type: "string", enum: [...JURISDICTIONS] } },
        licenses: { type: "array", items: { type: "string", enum: [...LICENSE_TYPES] } },
        dealTypes: { type: "array", items: { type: "string", enum: [...DEAL_TYPES] } },
        priceMin: { type: "integer", nullable: true },
        priceMax: { type: "integer", nullable: true },
      },
      required: ["sectors", "jurisdictions", "licenses", "dealTypes"],
    },
  });

  if (!result.ok) return { filters: heuristic, source: "heuristic" };

  const data = result.data;
  const filters: ParsedAssetQuery = {
    q: data.keywords.trim().slice(0, 120),
    sectors: keepKnown(SECTORS, data.sectors),
    jurisdictions: keepKnown(JURISDICTIONS, data.jurisdictions),
    licenses: keepKnown(LICENSE_TYPES, data.licenses),
    dealTypes: keepKnown(DEAL_TYPES, data.dealTypes) as DealType[],
    priceMin: normaliseAmount(data.priceMin),
    priceMax: normaliseAmount(data.priceMax),
  };

  // If the model found nothing but the regex engine did, prefer the regex result.
  const aiFoundNothing =
    !filters.sectors.length &&
    !filters.jurisdictions.length &&
    !filters.licenses.length &&
    !filters.dealTypes.length &&
    filters.priceMin === null &&
    filters.priceMax === null;

  if (aiFoundNothing && heuristicHasSignal(heuristic)) {
    return { filters: heuristic, source: "heuristic" };
  }
  if (filters.priceMin !== null && filters.priceMax !== null && filters.priceMin > filters.priceMax) {
    [filters.priceMin, filters.priceMax] = [filters.priceMax, filters.priceMin];
  }
  return { filters, source: "ai" };
}

function normaliseAmount(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function heuristicHasSignal(parsed: ParsedAssetQuery): boolean {
  return Boolean(
    parsed.sectors.length ||
      parsed.jurisdictions.length ||
      parsed.licenses.length ||
      parsed.dealTypes.length ||
      parsed.priceMin !== null ||
      parsed.priceMax !== null,
  );
}

export function hasAnyFilter(parsed: ParsedAssetQuery): boolean {
  return heuristicHasSignal(parsed) || Boolean(parsed.q);
}
