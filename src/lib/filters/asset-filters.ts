import { AssetStatus, DealType, Prisma, UserStatus } from "@prisma/client";
import {
  DEAL_TYPES,
  JURISDICTIONS,
  LICENSE_TYPES,
  SECTORS,
  keepKnown,
  type Jurisdiction,
  type LicenseType,
  type Sector,
} from "@/lib/taxonomy";
import { readInt, readList, readPage, readString, toSearchString, type RawSearchParams } from "./search-params";

export const ASSET_SORTS = ["newest", "priceAsc", "priceDesc", "revenueDesc"] as const;
export type AssetSort = (typeof ASSET_SORTS)[number];

export const ASSETS_PER_PAGE = 9;

export type AssetFilters = {
  q: string;
  sectors: Sector[];
  jurisdictions: Jurisdiction[];
  licenses: LicenseType[];
  dealTypes: DealType[];
  priceMin: number | null;
  priceMax: number | null;
  sort: AssetSort;
  page: number;
};

export const EMPTY_ASSET_FILTERS: AssetFilters = {
  q: "",
  sectors: [],
  jurisdictions: [],
  licenses: [],
  dealTypes: [],
  priceMin: null,
  priceMax: null,
  sort: "newest",
  page: 1,
};

export function parseAssetFilters(params: RawSearchParams): AssetFilters {
  const sortRaw = readString(params, "sort");
  const priceMin = readInt(params, "priceMin");
  const priceMax = readInt(params, "priceMax");

  return {
    q: readString(params, "q").slice(0, 120),
    sectors: keepKnown(SECTORS, readList(params, "sector")),
    jurisdictions: keepKnown(JURISDICTIONS, readList(params, "jurisdiction")),
    licenses: keepKnown(LICENSE_TYPES, readList(params, "license")),
    dealTypes: keepKnown(DEAL_TYPES, readList(params, "deal")) as DealType[],
    // A reversed range is a user slip, not an error worth a 400: swap it.
    priceMin: priceMin !== null && priceMax !== null ? Math.min(priceMin, priceMax) : priceMin,
    priceMax: priceMin !== null && priceMax !== null ? Math.max(priceMin, priceMax) : priceMax,
    sort: (ASSET_SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as AssetSort) : "newest",
    page: readPage(params),
  };
}

export function assetFiltersToQuery(filters: Partial<AssetFilters>): string {
  return toSearchString({
    q: filters.q ?? null,
    sector: filters.sectors ?? [],
    jurisdiction: filters.jurisdictions ?? [],
    license: filters.licenses ?? [],
    deal: filters.dealTypes ?? [],
    priceMin: filters.priceMin ?? null,
    priceMax: filters.priceMax ?? null,
    sort: filters.sort && filters.sort !== "newest" ? filters.sort : null,
    page: filters.page && filters.page > 1 ? filters.page : null,
  });
}

export function countActiveAssetFilters(filters: AssetFilters): number {
  return (
    (filters.q ? 1 : 0) +
    filters.sectors.length +
    filters.jurisdictions.length +
    filters.licenses.length +
    filters.dealTypes.length +
    (filters.priceMin !== null ? 1 : 0) +
    (filters.priceMax !== null ? 1 : 0)
  );
}

type Scope =
  | { kind: "public" }
  | { kind: "seller"; sellerId: string }
  | { kind: "manager"; statuses?: AssetStatus[] };

/**
 * Visibility is part of the query, not an afterthought:
 *  - public: only PUBLISHED listings whose seller is ACTIVE — suspending a
 *    seller must remove their inventory from the marketplace instantly;
 *  - seller: everything they own, drafts included;
 *  - manager: everything, so moderation can see what the public cannot.
 */
export function buildAssetWhere(filters: AssetFilters, scope: Scope): Prisma.AssetWhereInput {
  const and: Prisma.AssetWhereInput[] = [];

  if (scope.kind === "public") {
    and.push({ status: AssetStatus.PUBLISHED, seller: { status: UserStatus.ACTIVE } });
  } else if (scope.kind === "seller") {
    and.push({ sellerId: scope.sellerId });
  } else if (scope.statuses?.length) {
    and.push({ status: { in: scope.statuses } });
  }

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { summary: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { licenseType: { contains: filters.q, mode: "insensitive" } },
        { sector: { contains: filters.q, mode: "insensitive" } },
        { jurisdiction: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  if (filters.sectors.length) and.push({ sector: { in: filters.sectors } });
  if (filters.jurisdictions.length) and.push({ jurisdiction: { in: filters.jurisdictions } });
  if (filters.licenses.length) and.push({ licenseType: { in: filters.licenses } });
  if (filters.dealTypes.length) and.push({ dealType: { in: filters.dealTypes } });

  // "Price on request" listings (askingPrice = null) are only shown while no
  // price filter is active — a budget filter is a statement about money, and
  // silently keeping unpriced deals in the result set would make it meaningless.
  if (filters.priceMin !== null) and.push({ askingPrice: { gte: filters.priceMin } });
  if (filters.priceMax !== null) and.push({ askingPrice: { lte: filters.priceMax } });

  return and.length ? { AND: and } : {};
}

export function assetOrderBy(sort: AssetSort): Prisma.AssetOrderByWithRelationInput[] {
  switch (sort) {
    case "priceAsc":
      return [{ askingPrice: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "priceDesc":
      return [{ askingPrice: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "revenueDesc":
      return [{ revenue: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "newest":
    default:
      return [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
  }
}
