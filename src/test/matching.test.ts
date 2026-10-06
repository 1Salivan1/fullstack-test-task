import { describe, expect, it } from "vitest";
import { DealType } from "@prisma/client";
import { mandateCompleteness, rankMatches, scoreMatch, type AssetLike, type MandateLike } from "@/lib/matching/score";

const asset: AssetLike = {
  sector: "Payments",
  jurisdiction: "Lithuania",
  dealType: DealType.FULL_SALE,
  askingPrice: 3_000_000,
  licenseType: "EMI",
  title: "Lithuanian EMI with SEPA rails",
  summary: "Profitable EMI with SEPA Instant",
};

const mandate: MandateLike = {
  sectors: ["Payments"],
  geographies: ["Lithuania"],
  dealTypes: [DealType.FULL_SALE],
  ticketMin: 1_000_000,
  ticketMax: 6_000_000,
  thesis: "We buy profitable EU payment businesses with SEPA access.",
};

describe("scoreMatch", () => {
  it("scores a full match near the top", () => {
    const { score, factors } = scoreMatch(asset, mandate);

    expect(score).toBeGreaterThanOrEqual(95);
    expect(factors.map((f) => f.code)).toEqual(
      expect.arrayContaining(["sectorMatch", "geoMatch", "dealTypeMatch", "priceInRange"]),
    );
  });

  it("penalises an asset priced above the buyer's ceiling", () => {
    const { score, factors } = scoreMatch({ ...asset, askingPrice: 50_000_000 }, mandate);

    expect(score).toBeLessThan(scoreMatch(asset, mandate).score);
    expect(factors.map((f) => f.code)).toContain("priceAboveRange");
  });

  it("treats an undisclosed price as neutral rather than disqualifying", () => {
    const unpriced = scoreMatch({ ...asset, askingPrice: null }, mandate);
    const tooExpensive = scoreMatch({ ...asset, askingPrice: 50_000_000 }, mandate);

    expect(unpriced.score).toBeGreaterThan(tooExpensive.score);
    expect(unpriced.factors.map((f) => f.code)).toContain("priceUnknown");
  });

  it("gives an open mandate partial credit instead of a false perfect match", () => {
    const open = scoreMatch(asset, {
      sectors: [],
      geographies: [],
      dealTypes: [],
      ticketMin: null,
      ticketMax: null,
      thesis: "",
    });

    expect(open.score).toBeGreaterThan(0);
    expect(open.score).toBeLessThan(scoreMatch(asset, mandate).score);
    expect(open.factors.map((f) => f.code)).toContain("sectorOpen");
  });

  it("never leaves the 0-100 range", () => {
    const mismatch = scoreMatch(
      { ...asset, sector: "Gaming & Betting", jurisdiction: "Malta", dealType: DealType.MINORITY, askingPrice: 99_000_000 },
      mandate,
    );

    expect(mismatch.score).toBeGreaterThanOrEqual(0);
    expect(mismatch.score).toBeLessThanOrEqual(100);
  });
});

describe("rankMatches", () => {
  it("sorts by score and respects the limit", () => {
    const candidates = [
      { id: "weak", sector: "Gaming & Betting" },
      { id: "strong", sector: "Payments" },
      { id: "medium", sector: "Banking" },
    ];

    const ranked = rankMatches(
      candidates,
      (candidate) => ({ asset: { ...asset, sector: candidate.sector }, mandate }),
      2,
    );

    expect(ranked).toHaveLength(2);
    expect(ranked[0]!.candidate.id).toBe("strong");
  });
});

describe("mandateCompleteness", () => {
  it("is 100% only when every signal the matcher needs is present", () => {
    expect(mandateCompleteness(mandate)).toBe(100);
    expect(
      mandateCompleteness({
        thesis: "",
        sectors: [],
        geographies: [],
        dealTypes: [],
        ticketMin: null,
        ticketMax: null,
      }),
    ).toBe(0);
  });

  it("ignores a thesis that is too short to be useful", () => {
    expect(mandateCompleteness({ ...mandate, thesis: "Exploring." })).toBe(80);
  });
});
