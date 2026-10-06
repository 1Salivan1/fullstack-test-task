import { Prisma, Role, UserStatus, Visibility } from "@prisma/client";
import { db } from "@/lib/db";
import {
  BUYERS_PER_PAGE,
  buildBuyerWhere,
  buyerOrderBy,
  type BuyerFilters,
} from "@/lib/filters/buyer-filters";

const buyerSelect = {
  id: true,
  userId: true,
  companyName: true,
  country: true,
  investorType: true,
  thesis: true,
  sectors: true,
  geographies: true,
  dealTypes: true,
  ticketMin: true,
  ticketMax: true,
  currency: true,
  timeline: true,
  visibility: true,
  verified: true,
  createdAt: true,
  user: { select: { id: true, name: true, status: true } },
} satisfies Prisma.BuyerProfileSelect;

export type BuyerListItem = Prisma.BuyerProfileGetPayload<{ select: typeof buyerSelect }>;

export async function listBuyers(filters: BuyerFilters, options: { includeInactive: boolean }) {
  const where = buildBuyerWhere(filters, options);
  const take = BUYERS_PER_PAGE;

  const [total, items] = await Promise.all([
    db.buyerProfile.count({ where }),
    db.buyerProfile.findMany({
      where,
      orderBy: buyerOrderBy(filters.sort),
      skip: (filters.page - 1) * take,
      take,
      select: buyerSelect,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / take));
  return { items, total, pageCount, page: Math.min(filters.page, pageCount) };
}

export async function getBuyerByUserId(userId: string) {
  return db.buyerProfile.findUnique({ where: { userId }, select: buyerSelect });
}

export async function getBuyerProfileForViewer(
  userId: string,
  viewer: { id: string; role: Role } | null,
) {
  const profile = await db.buyerProfile.findUnique({ where: { userId }, select: buyerSelect });
  if (!profile) return null;

  const isSelf = viewer?.id === userId;
  const isManager = viewer?.role === Role.MANAGER;
  if (profile.user.status !== UserStatus.ACTIVE && !isSelf && !isManager) return null;

  return { ...profile, isSelf, viewerIsManager: isManager };
}

/**
 * An ANONYMOUS buyer still appears in the catalogue — the mandate is the useful
 * part for a seller — but the company name and personal name are withheld until
 * the buyer engages in a conversation. Masking happens here rather than in the
 * view so no page can leak it by accident.
 */
export function maskBuyerIdentity<T extends { companyName: string; visibility: Visibility; user: { name: string } }>(
  buyer: T,
  options: { reveal: boolean },
): T & { isMasked: boolean } {
  if (buyer.visibility === Visibility.PUBLIC || options.reveal) {
    return { ...buyer, isMasked: false };
  }
  return {
    ...buyer,
    companyName: "",
    user: { ...buyer.user, name: "" },
    isMasked: true,
  };
}

/** Active buyer mandates — the candidate pool for seller-side matching. */
export async function getMatchableBuyers(limit = 60) {
  return db.buyerProfile.findMany({
    where: { user: { role: Role.BUYER, status: UserStatus.ACTIVE } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: buyerSelect,
  });
}

export async function countBuyers() {
  return db.buyerProfile.count({ where: { user: { status: UserStatus.ACTIVE } } });
}
