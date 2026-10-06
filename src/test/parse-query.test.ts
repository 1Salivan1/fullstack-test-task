import { describe, expect, it } from "vitest";
import { heuristicParse, parseAmount } from "@/lib/ai/features/parse-query";
import { containsTerm } from "@/lib/taxonomy";

describe("parseAmount", () => {
  it("expands magnitude suffixes", () => {
    expect(parseAmount("2.5M")).toBe(2_500_000);
    expect(parseAmount("800k")).toBe(800_000);
    expect(parseAmount("€1,2 million")).toBe(1_200_000);
    expect(parseAmount("1 200 000")).toBe(1_200_000);
  });

  it("returns null for text without a number", () => {
    expect(parseAmount("cheap")).toBeNull();
  });
});

describe("containsTerm", () => {
  it("matches whole words only", () => {
    expect(containsTerm("under 5m", "de")).toBe(false);
    expect(containsTerm("based in de", "de")).toBe(true);
    expect(containsTerm("business in the us", "us")).toBe(true);
    expect(containsTerm("trustworthy", "us")).toBe(false);
  });
});

describe("heuristicParse", () => {
  it("extracts sector, jurisdiction, licence, deal type and a price ceiling", () => {
    const parsed = heuristicParse("profitable EMI in Lithuania under 5M, full sale");

    expect(parsed.sectors).toContain("E-money / EMI");
    expect(parsed.jurisdictions).toEqual(["Lithuania"]);
    expect(parsed.licenses).toContain("EMI");
    expect(parsed.dealTypes).toContain("FULL_SALE");
    expect(parsed.priceMax).toBe(5_000_000);
    expect(parsed.priceMin).toBeNull();
  });

  it("does not infer a country from a substring inside another word", () => {
    // Regression: "under" used to be read as the "de" alias for Germany.
    expect(heuristicParse("payments business under 1M").jurisdictions).toEqual([]);
  });

  it("reads a two-sided range", () => {
    const parsed = heuristicParse("crypto custody in UAE between 2m and 8m, minority stake");

    expect(parsed.priceMin).toBe(2_000_000);
    expect(parsed.priceMax).toBe(8_000_000);
    expect(parsed.sectors).toEqual(["Crypto & Digital Assets"]);
    expect(parsed.dealTypes).toContain("MINORITY");
  });

  it("falls back to free-text search when nothing structured is recognised", () => {
    const parsed = heuristicParse("something totally unrelated");

    expect(parsed.q).toBe("something totally unrelated");
    expect(parsed.sectors).toEqual([]);
  });

  it("drops the free-text query once structured filters are found", () => {
    expect(heuristicParse("banking licence in Malta").q).toBe("");
  });
});
