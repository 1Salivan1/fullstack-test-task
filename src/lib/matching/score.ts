import type { DealType } from "@prisma/client";

/**
 * Deterministic Buyer <-> Asset fit scoring.
 *
 * This is the backbone of the matching feature and runs with or without AI:
 *  - on its own it produces the ranking and the structured reasons shown in the
 *    UI (so matching never depends on a third-party API being up);
 *  - with AI enabled it pre-selects the shortlist that goes into the prompt, so
 *    the model ranks ~12 candidates instead of the whole marketplace.
 *
 * Factors are returned as codes, not sentences, so they can be translated.
 */

export type MatchFactorCode =
  | "sectorMatch"
  | "sectorOpen"
  | "sectorMiss"
  | "geoMatch"
  | "geoOpen"
  | "geoMiss"
  | "dealTypeMatch"
  | "dealTypeOpen"
  | "dealTypeMiss"
  | "priceInRange"
  | "priceBelowRange"
  | "priceAboveRange"
  | "priceUnknown"
  | "thesisOverlap";

export type MatchFactor = {
  code: MatchFactorCode;
  positive: boolean;
  value?: string;
};

export type MatchResult = {
  score: number;
  factors: MatchFactor[];
};

export type MandateLike = {
  sectors: string[];
  geographies: string[];
  dealTypes: DealType[];
  ticketMin: number | null;
  ticketMax: number | null;
  thesis: string;
};

export type AssetLike = {
  sector: string;
  jurisdiction: string;
  dealType: DealType;
  askingPrice: number | null;
  licenseType: string;
  title: string;
  summary: string;
  description?: string;
};

const WEIGHTS = {
  sector: 35,
  geography: 25,
  dealType: 15,
  price: 20,
  thesis: 5,
} as const;

const STOP_WORDS = new Set([
  "the", "and", "with", "for", "from", "that", "this", "have", "are", "our", "their", "will",
  "into", "them", "they", "which", "while", "would", "about", "least", "than", "then", "over",
  "under", "live", "want", "looking", "acquire", "business", "businesses", "company", "companies",
]);

function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9€$£+-]+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
  );
}

export function scoreMatch(asset: AssetLike, mandate: MandateLike): MatchResult {
  const factors: MatchFactor[] = [];
  let score = 0;

  // Sector.
  if (mandate.sectors.length === 0) {
    score += WEIGHTS.sector * 0.5;
    factors.push({ code: "sectorOpen", positive: false });
  } else if (mandate.sectors.includes(asset.sector)) {
    score += WEIGHTS.sector;
    factors.push({ code: "sectorMatch", positive: true, value: asset.sector });
  } else {
    factors.push({ code: "sectorMiss", positive: false, value: asset.sector });
  }

  // Geography.
  if (mandate.geographies.length === 0) {
    score += WEIGHTS.geography * 0.5;
    factors.push({ code: "geoOpen", positive: false });
  } else if (mandate.geographies.includes(asset.jurisdiction)) {
    score += WEIGHTS.geography;
    factors.push({ code: "geoMatch", positive: true, value: asset.jurisdiction });
  } else {
    factors.push({ code: "geoMiss", positive: false, value: asset.jurisdiction });
  }

  // Deal structure.
  if (mandate.dealTypes.length === 0) {
    score += WEIGHTS.dealType * 0.5;
    factors.push({ code: "dealTypeOpen", positive: false });
  } else if (mandate.dealTypes.includes(asset.dealType)) {
    score += WEIGHTS.dealType;
    factors.push({ code: "dealTypeMatch", positive: true, value: asset.dealType });
  } else {
    factors.push({ code: "dealTypeMiss", positive: false, value: asset.dealType });
  }

  // Ticket vs asking price. An undisclosed price is neutral, not disqualifying:
  // "price on request" is normal in M&A and the parties discover it in talks.
  const { askingPrice } = asset;
  if (askingPrice === null) {
    score += WEIGHTS.price * 0.5;
    factors.push({ code: "priceUnknown", positive: false });
  } else {
    const min = mandate.ticketMin ?? 0;
    const max = mandate.ticketMax ?? Number.POSITIVE_INFINITY;
    if (askingPrice >= min && askingPrice <= max) {
      score += WEIGHTS.price;
      factors.push({ code: "priceInRange", positive: true });
    } else if (askingPrice < min) {
      // Affordable but below the buyer's floor — often still interesting as an
      // add-on acquisition, so it keeps partial credit.
      score += WEIGHTS.price * 0.4;
      factors.push({ code: "priceBelowRange", positive: false });
    } else {
      factors.push({ code: "priceAboveRange", positive: false });
    }
  }

  // Free-text overlap between the thesis and the listing.
  if (mandate.thesis.trim()) {
    const assetWords = significantWords(
      [asset.title, asset.summary, asset.description ?? "", asset.licenseType].join(" "),
    );
    const thesisWords = significantWords(mandate.thesis);
    let shared = 0;
    for (const word of thesisWords) if (assetWords.has(word)) shared += 1;
    if (shared > 0) {
      score += Math.min(WEIGHTS.thesis, shared);
      factors.push({ code: "thesisOverlap", positive: true, value: String(shared) });
    }
  }

  return { score: Math.round(Math.max(0, Math.min(100, score))), factors };
}

export function rankMatches<T>(
  candidates: T[],
  toInputs: (candidate: T) => { asset: AssetLike; mandate: MandateLike },
  limit: number,
): Array<{ candidate: T } & MatchResult> {
  return candidates
    .map((candidate) => {
      const { asset, mandate } = toInputs(candidate);
      return { candidate, ...scoreMatch(asset, mandate) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Completeness of a buyer mandate, used for the dashboard nudge. Deliberately
 * simple and explainable — a buyer should be able to see why it is not 100%.
 */
export function mandateCompleteness(mandate: {
  thesis: string;
  sectors: string[];
  geographies: string[];
  dealTypes: DealType[];
  ticketMin: number | null;
  ticketMax: number | null;
}): number {
  const checks = [
    mandate.thesis.trim().length >= 40,
    mandate.sectors.length > 0,
    mandate.geographies.length > 0,
    mandate.dealTypes.length > 0,
    mandate.ticketMin !== null || mandate.ticketMax !== null,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
