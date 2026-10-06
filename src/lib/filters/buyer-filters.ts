import { DealType, InvestorType, Prisma, Role, UserStatus } from "@prisma/client";
import { DEAL_TYPES, INVESTOR_TYPES, JURISDICTIONS, SECTORS, keepKnown, type Jurisdiction, type Sector } from "@/lib/taxonomy";
import { readInt, readList, readPage, readString, toSearchString, type RawSearchParams } from "./search-params";

export const BUYER_SORTS = ["newest", "ticketDesc", "ticketAsc"] as const;
export type BuyerSort = (typeof BUYER_SORTS)[number];

export const BUYERS_PER_PAGE = 9;

export type BuyerFilters = {
  q: string;
  sectors: Sector[];
  geographies: Jurisdiction[];
  dealTypes: DealType[];
  investorTypes: InvestorType[];
  ticketMin: number | null;
  ticketMax: number | null;
  sort: BuyerSort;
  page: number;
};

export const EMPTY_BUYER_FILTERS: BuyerFilters = {
  q: "",
  sectors: [],
  geographies: [],
  dealTypes: [],
  investorTypes: [],
  ticketMin: null,
  ticketMax: null,
  sort: "newest",
  page: 1,
};

export function parseBuyerFilters(params: RawSearchParams): BuyerFilters {
  const sortRaw = readString(params, "sort");
  const ticketMin = readInt(params, "ticketMin");
  const ticketMax = readInt(params, "ticketMax");

  return {
    q: readString(params, "q").slice(0, 120),
    sectors: keepKnown(SECTORS, readList(params, "sector")),
    geographies: keepKnown(JURISDICTIONS, readList(params, "geography")),
    dealTypes: keepKnown(DEAL_TYPES, readList(params, "deal")) as DealType[],
    investorTypes: keepKnown(INVESTOR_TYPES, readList(params, "investor")) as InvestorType[],
    ticketMin: ticketMin !== null && ticketMax !== null ? Math.min(ticketMin, ticketMax) : ticketMin,
    ticketMax: ticketMin !== null && ticketMax !== null ? Math.max(ticketMin, ticketMax) : ticketMax,
    sort: (BUYER_SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as BuyerSort) : "newest",
    page: readPage(params),
  };
}

export function buyerFiltersToQuery(filters: Partial<BuyerFilters>): string {
  return toSearchString({
    q: filters.q ?? null,
    sector: filters.sectors ?? [],
    geography: filters.geographies ?? [],
    deal: filters.dealTypes ?? [],
    investor: filters.investorTypes ?? [],
    ticketMin: filters.ticketMin ?? null,
    ticketMax: filters.ticketMax ?? null,
    sort: filters.sort && filters.sort !== "newest" ? filters.sort : null,
    page: filters.page && filters.page > 1 ? filters.page : null,
  });
}

export function countActiveBuyerFilters(filters: BuyerFilters): number {
  return (
    (filters.q ? 1 : 0) +
    filters.sectors.length +
    filters.geographies.length +
    filters.dealTypes.length +
    filters.investorTypes.length +
    (filters.ticketMin !== null ? 1 : 0) +
    (filters.ticketMax !== null ? 1 : 0)
  );
}

/**
 * Ticket filtering uses range *overlap*, not containment: a seller asking
 * "who could write a €2M cheque" wants every buyer whose range includes €2M,
 * and an open-ended side of a buyer's range counts as unbounded.
 */
export function buildBuyerWhere(
  filters: BuyerFilters,
  scope: { includeInactive: boolean },
): Prisma.BuyerProfileWhereInput {
  const and: Prisma.BuyerProfileWhereInput[] = [
    {
      user: {
        role: Role.BUYER,
        ...(scope.includeInactive ? {} : { status: UserStatus.ACTIVE }),
      },
    },
  ];

  if (filters.q) {
    and.push({
      OR: [
        { companyName: { contains: filters.q, mode: "insensitive" } },
        { thesis: { contains: filters.q, mode: "insensitive" } },
        { country: { contains: filters.q, mode: "insensitive" } },
        { sectors: { has: filters.q } },
        { user: { name: { contains: filters.q, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.sectors.length) and.push({ sectors: { hasSome: filters.sectors } });
  if (filters.geographies.length) and.push({ geographies: { hasSome: filters.geographies } });
  if (filters.dealTypes.length) and.push({ dealTypes: { hasSome: filters.dealTypes } });
  if (filters.investorTypes.length) and.push({ investorType: { in: filters.investorTypes } });

  if (filters.ticketMin !== null) {
    and.push({ OR: [{ ticketMax: null }, { ticketMax: { gte: filters.ticketMin } }] });
  }
  if (filters.ticketMax !== null) {
    and.push({ OR: [{ ticketMin: null }, { ticketMin: { lte: filters.ticketMax } }] });
  }

  return { AND: and };
}

export function buyerOrderBy(sort: BuyerSort): Prisma.BuyerProfileOrderByWithRelationInput[] {
  switch (sort) {
    case "ticketDesc":
      return [{ ticketMax: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "ticketAsc":
      return [{ ticketMin: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}
