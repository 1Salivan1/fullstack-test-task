import { DealType, InvestorType } from "@prisma/client";
import { z } from "zod";

/**
 * Single source of truth for the marketplace vocabulary.
 *
 * Sector / jurisdiction / licence values are industry terms and stay in English
 * in every locale (an "EMI licence" is an EMI licence in Ukrainian too) — only
 * enum labels and UI copy are translated. Keeping them here means filters,
 * forms, seed data and the AI prompts all speak the same language.
 */
export const SECTORS = [
  "Payments",
  "E-money / EMI",
  "Banking",
  "Crypto & Digital Assets",
  "Lending",
  "WealthTech",
  "InsurTech",
  "RegTech",
  "FX & Brokerage",
  "Gaming & Betting",
  "SaaS & Platforms",
] as const;

export const JURISDICTIONS = [
  "Lithuania",
  "Estonia",
  "Latvia",
  "Poland",
  "Czech Republic",
  "Germany",
  "France",
  "Netherlands",
  "United Kingdom",
  "Ireland",
  "Cyprus",
  "Malta",
  "Switzerland",
  "UAE",
  "Singapore",
  "United States",
  "Canada",
] as const;

export const LICENSE_TYPES = [
  "EMI",
  "Payment Institution (PI)",
  "Small PI",
  "MiCA (CASP)",
  "VASP",
  "Banking licence",
  "MiFID investment firm",
  "Consumer lending licence",
  "Gaming licence",
  "Unregulated",
] as const;

export const CURRENCIES = ["EUR", "USD", "GBP"] as const;

export const DEAL_TYPES = Object.values(DealType);
export const INVESTOR_TYPES = Object.values(InvestorType);

export const TIMELINES = [
  "0-3 months",
  "3-6 months",
  "6-12 months",
  "Opportunistic",
] as const;

export type Sector = (typeof SECTORS)[number];
export type Jurisdiction = (typeof JURISDICTIONS)[number];
export type LicenseType = (typeof LICENSE_TYPES)[number];
export type Currency = (typeof CURRENCIES)[number];

export const sectorSchema = z.enum(SECTORS);
export const jurisdictionSchema = z.enum(JURISDICTIONS);
export const licenseSchema = z.enum(LICENSE_TYPES);
export const currencySchema = z.enum(CURRENCIES);

/** Narrow unknown strings (URL params, AI output) onto the taxonomy. */
export function keepKnown<T extends readonly string[]>(
  vocabulary: T,
  values: readonly string[],
): T[number][] {
  const allowed = new Set<string>(vocabulary);
  return values.filter((v): v is T[number] => allowed.has(v));
}

/**
 * Loose matching used by the deterministic NL-query parser and by the AI
 * normaliser: "fintech payments in lithuania" -> ["Payments"], ["Lithuania"].
 */
/**
 * Whole-word containment. Plain `includes` is not good enough here: short
 * aliases such as "de" (Germany) or "us" (United States) otherwise match inside
 * ordinary words — "under 5M" would be read as a request for Germany.
 */
export function containsTerm(text: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}

export function findInVocabulary<T extends readonly string[]>(
  vocabulary: T,
  haystack: string,
  aliases: Record<string, T[number]> = {},
): T[number][] {
  const text = haystack.toLowerCase();
  const hits = new Set<T[number]>();

  for (const term of vocabulary) {
    const needles = term
      .toLowerCase()
      .split(/[/&()]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 2);
    if (needles.some((n) => containsTerm(text, n))) hits.add(term as T[number]);
  }
  for (const [alias, value] of Object.entries(aliases)) {
    if (containsTerm(text, alias.toLowerCase())) hits.add(value);
  }
  return [...hits];
}

export const SECTOR_ALIASES: Record<string, Sector> = {
  fintech: "Payments",
  psp: "Payments",
  acquiring: "Payments",
  "e-money": "E-money / EMI",
  emi: "E-money / EMI",
  crypto: "Crypto & Digital Assets",
  exchange: "Crypto & Digital Assets",
  bitcoin: "Crypto & Digital Assets",
  "digital asset": "Crypto & Digital Assets",
  bank: "Banking",
  neobank: "Banking",
  credit: "Lending",
  loan: "Lending",
  bnpl: "Lending",
  wealth: "WealthTech",
  broker: "FX & Brokerage",
  forex: "FX & Brokerage",
  insurance: "InsurTech",
  compliance: "RegTech",
  kyc: "RegTech",
  aml: "RegTech",
  casino: "Gaming & Betting",
  igaming: "Gaming & Betting",
  betting: "Gaming & Betting",
  saas: "SaaS & Platforms",
  software: "SaaS & Platforms",
};

export const JURISDICTION_ALIASES: Record<string, Jurisdiction> = {
  lt: "Lithuania",
  vilnius: "Lithuania",
  ee: "Estonia",
  tallinn: "Estonia",
  uk: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  london: "United Kingdom",
  usa: "United States",
  us: "United States",
  america: "United States",
  dubai: "UAE",
  "abu dhabi": "UAE",
  emirates: "UAE",
  de: "Germany",
  berlin: "Germany",
  warsaw: "Poland",
  nicosia: "Cyprus",
  zurich: "Switzerland",
};

export const LICENSE_ALIASES: Record<string, LicenseType> = {
  emi: "EMI",
  "e-money": "EMI",
  "electronic money": "EMI",
  pi: "Payment Institution (PI)",
  "payment institution": "Payment Institution (PI)",
  spi: "Small PI",
  mica: "MiCA (CASP)",
  casp: "MiCA (CASP)",
  vasp: "VASP",
  bank: "Banking licence",
  mifid: "MiFID investment firm",
  gaming: "Gaming licence",
  curacao: "Gaming licence",
};

export const DEAL_TYPE_ALIASES: Record<string, DealType> = {
  "full sale": DealType.FULL_SALE,
  "100%": DealType.FULL_SALE,
  outright: DealType.FULL_SALE,
  majority: DealType.MAJORITY,
  control: DealType.MAJORITY,
  minority: DealType.MINORITY,
  stake: DealType.MINORITY,
  "asset deal": DealType.ASSET_DEAL,
  "asset purchase": DealType.ASSET_DEAL,
  "licence vehicle": DealType.ASSET_DEAL,
  "licence transfer": DealType.ASSET_DEAL,
};
