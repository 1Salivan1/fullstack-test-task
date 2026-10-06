import { describe, expect, it } from "vitest";
import { AssetStatus, UserStatus } from "@prisma/client";
import {
  assetFiltersToQuery,
  buildAssetWhere,
  countActiveAssetFilters,
  parseAssetFilters,
} from "@/lib/filters/asset-filters";
import { buildBuyerWhere, parseBuyerFilters } from "@/lib/filters/buyer-filters";

describe("parseAssetFilters", () => {
  it("keeps only values that exist in the taxonomy", () => {
    const filters = parseAssetFilters({
      sector: ["Payments", "Teleportation"],
      jurisdiction: "Atlantis",
      deal: ["FULL_SALE", "BARTER"],
    });

    expect(filters.sectors).toEqual(["Payments"]);
    expect(filters.jurisdictions).toEqual([]);
    expect(filters.dealTypes).toEqual(["FULL_SALE"]);
  });

  it("accepts both repeated and comma-separated params", () => {
    expect(parseAssetFilters({ sector: "Payments,Banking" }).sectors).toEqual([
      "Payments",
      "Banking",
    ]);
  });

  it("swaps an inverted price range instead of rejecting it", () => {
    const filters = parseAssetFilters({ priceMin: "5000000", priceMax: "1000000" });

    expect(filters.priceMin).toBe(1_000_000);
    expect(filters.priceMax).toBe(5_000_000);
  });

  it("falls back to safe defaults for junk input", () => {
    const filters = parseAssetFilters({ page: "-3", sort: "random", priceMin: "abc" });

    expect(filters.page).toBe(1);
    expect(filters.sort).toBe("newest");
    expect(filters.priceMin).toBeNull();
  });

  it("round-trips through the query string", () => {
    const filters = parseAssetFilters({
      q: "emi",
      sector: "Payments",
      priceMax: "2000000",
      sort: "priceAsc",
      page: "2",
    });
    const query = assetFiltersToQuery(filters);

    expect(parseAssetFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters);
    expect(countActiveAssetFilters(filters)).toBe(3);
  });
});

describe("buildAssetWhere", () => {
  it("restricts the public catalogue to published listings of active sellers", () => {
    const where = buildAssetWhere(parseAssetFilters({}), { kind: "public" });

    expect(where.AND).toContainEqual({
      status: AssetStatus.PUBLISHED,
      seller: { status: UserStatus.ACTIVE },
    });
  });

  it("scopes a seller to their own listings regardless of status", () => {
    const where = buildAssetWhere(parseAssetFilters({}), { kind: "seller", sellerId: "u1" });

    expect(where.AND).toEqual([{ sellerId: "u1" }]);
  });

  it("excludes price-on-request listings when a budget filter is active", () => {
    const where = buildAssetWhere(parseAssetFilters({ priceMax: "3000000" }), { kind: "public" });

    expect(where.AND).toContainEqual({ askingPrice: { lte: 3_000_000 } });
  });

  it("lets a manager see every status by default", () => {
    const where = buildAssetWhere(parseAssetFilters({}), { kind: "manager" });

    expect(where).toEqual({});
  });
});

describe("buildBuyerWhere", () => {
  it("hides non-active buyers from sellers but not from managers", () => {
    const forSeller = buildBuyerWhere(parseBuyerFilters({}), { includeInactive: false });
    const forManager = buildBuyerWhere(parseBuyerFilters({}), { includeInactive: true });

    expect(JSON.stringify(forSeller)).toContain(UserStatus.ACTIVE);
    expect(JSON.stringify(forManager)).not.toContain(UserStatus.ACTIVE);
  });

  it("treats ticket ranges as overlapping, with open ends counting as unbounded", () => {
    const where = buildBuyerWhere(parseBuyerFilters({ ticketMin: "2000000" }), {
      includeInactive: false,
    });

    expect(where.AND).toContainEqual({
      OR: [{ ticketMax: null }, { ticketMax: { gte: 2_000_000 } }],
    });
  });
});
