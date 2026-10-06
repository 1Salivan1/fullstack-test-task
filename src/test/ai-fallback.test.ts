import { beforeEach, describe, expect, it } from "vitest";
import { DealType } from "@prisma/client";
import { reviewListingDeterministic, type ListingDraft } from "@/lib/ai/features/review-listing";
import { draftMessageDeterministic } from "@/lib/ai/features/draft-message";
import { checkRateLimit, resetRateLimits } from "@/lib/ai/rate-limit";

const complete: ListingDraft = {
  title: "Lithuanian EMI with live SEPA and card issuing",
  summary: "Profitable EMI, 3 400 active business clients, SEPA Instant and BIN sponsorship.",
  description: "x".repeat(400),
  sector: "E-money / EMI",
  jurisdiction: "Lithuania",
  licenseType: "EMI",
  dealType: DealType.FULL_SALE,
  askingPrice: 4_200_000,
  currency: "EUR",
  revenue: 3_100_000,
  ebitda: 820_000,
  employees: 24,
  foundedYear: 2019,
  highlights: ["Licence in good standing", "SEPA Instant", "Positive EBITDA"],
};

describe("reviewListingDeterministic", () => {
  it("passes a complete listing", () => {
    const review = reviewListingDeterministic(complete, "en");

    expect(review.score).toBe(100);
    expect(review.issues).toEqual([]);
    expect(review.source).toBe("heuristic");
  });

  it("flags missing financials as issues, not suggestions", () => {
    const review = reviewListingDeterministic(
      { ...complete, revenue: null, ebitda: null, askingPrice: null },
      "en",
    );

    expect(review.score).toBeLessThan(70);
    expect(review.issues.length).toBeGreaterThanOrEqual(3);
  });

  it("separates nice-to-haves from blockers", () => {
    const review = reviewListingDeterministic({ ...complete, employees: null }, "en");

    expect(review.issues).toEqual([]);
    expect(review.suggestions).toHaveLength(1);
  });

  it("localises its findings", () => {
    const en = reviewListingDeterministic({ ...complete, revenue: null }, "en");
    const uk = reviewListingDeterministic({ ...complete, revenue: null }, "uk");

    expect(en.issues[0]).not.toBe(uk.issues[0]);
    expect(uk.issues[0]).toMatch(/[А-Яа-яЇїІіЄєҐґ]/);
  });
});

describe("draftMessageDeterministic", () => {
  it("produces a usable message in both locales without any API call", () => {
    const context = {
      direction: "buyerToSeller" as const,
      senderName: "Anna Kovalenko",
      senderCompany: "Meridian Payments Group",
      recipientName: "Marek Novak",
      assetTitle: "Lithuanian EMI",
      assetFacts: "EMI, Lithuania",
      mandateFacts: "Payments, EUR 1-6M",
    };

    const en = draftMessageDeterministic(context, "en");
    const uk = draftMessageDeterministic(context, "uk");

    expect(en.text).toContain("Marek Novak");
    expect(en.text).toContain("Lithuanian EMI");
    expect(en.source).toBe("heuristic");
    expect(uk.text).toMatch(/[А-Яа-яЇїІіЄєҐґ]/);
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows a burst then blocks further requests for the same key", () => {
    const results = Array.from({ length: 10 }, () => checkRateLimit("user-1").allowed);

    expect(results.filter(Boolean)).toHaveLength(8);
    expect(results.at(-1)).toBe(false);
  });

  it("keys are independent", () => {
    for (let i = 0; i < 8; i += 1) checkRateLimit("user-1");

    expect(checkRateLimit("user-1").allowed).toBe(false);
    expect(checkRateLimit("user-2").allowed).toBe(true);
  });
});
