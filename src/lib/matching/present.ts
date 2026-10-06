import type { DealType } from "@prisma/client";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { MatchFactor } from "./score";

/** Turns a structured match factor into a localised sentence. */
export function factorLabel(d: Dictionary, factor: MatchFactor): string {
  const dealTypeLabel = (value?: string) =>
    value && value in d.dealTypes ? d.dealTypes[value as DealType] : (value ?? "");

  switch (factor.code) {
    case "sectorMatch":
      return d.match.sectorMatch(factor.value ?? "");
    case "sectorOpen":
      return d.match.sectorOpen;
    case "sectorMiss":
      return d.match.sectorMiss(factor.value ?? "");
    case "geoMatch":
      return d.match.geoMatch(factor.value ?? "");
    case "geoOpen":
      return d.match.geoOpen;
    case "geoMiss":
      return d.match.geoMiss(factor.value ?? "");
    case "dealTypeMatch":
      return d.match.dealTypeMatch(dealTypeLabel(factor.value));
    case "dealTypeOpen":
      return d.match.dealTypeOpen;
    case "dealTypeMiss":
      return d.match.dealTypeMiss(dealTypeLabel(factor.value));
    case "priceInRange":
      return d.match.priceInRange;
    case "priceBelowRange":
      return d.match.priceBelowRange;
    case "priceAboveRange":
      return d.match.priceAboveRange;
    case "priceUnknown":
      return d.match.priceUnknown;
    case "thesisOverlap":
      return d.match.thesisOverlap(factor.value ?? "0");
  }
}
