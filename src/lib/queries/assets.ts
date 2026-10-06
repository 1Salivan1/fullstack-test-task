import { AssetStatus, Prisma, Role, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ASSETS_PER_PAGE,
  assetOrderBy,
  buildAssetWhere,
  type AssetFilters,
} from "@/lib/filters/asset-filters";
import type { SessionUser } from "@/lib/auth/session";

const listSelect = {
  id: true,
  title: true,
  summary: true,
  sector: true,
  jurisdiction: true,
  licenseType: true,
  dealType: true,
  askingPrice: true,
  currency: true,
  revenue: true,
  ebitda: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  seller: {
    select: {
      id: true,
      name: true,
      status: true,
      sellerProfile: { select: { companyName: true, verified: true } },
    },
  },
} satisfies Prisma.AssetSelect;

export type AssetListItem = Prisma.AssetGetPayload<{ select: typeof listSelect }>;

export type AssetScope =
  | { kind: "public" }
  | { kind: "seller"; sellerId: string }
  | { kind: "manager"; statuses?: AssetStatus[] };

export async function listAssets(filters: AssetFilters, scope: AssetScope) {
  const where = buildAssetWhere(filters, scope);
  const take = ASSETS_PER_PAGE;

  const [total, items] = await Promise.all([
    db.asset.count({ where }),
    db.asset.findMany({
      where,
      orderBy: assetOrderBy(filters.sort),
      skip: (filters.page - 1) * take,
      take,
      select: listSelect,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / take));
  return { items, total, pageCount, page: Math.min(filters.page, pageCount) };
}

export async function getAssetForViewer(id: string, viewer: SessionUser | null) {
  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          status: true,
          sellerProfile: true,
        },
      },
    },
  });
  if (!asset) return null;

  const isOwner = viewer?.id === asset.sellerId;
  const isManager = viewer?.role === Role.MANAGER;

  // Drafts belong to their owner; suspended listings and listings of suspended
  // sellers stay reachable for the owner and for moderation only.
  const publiclyVisible =
    asset.status === AssetStatus.PUBLISHED && asset.seller.status === UserStatus.ACTIVE;
  if (!publiclyVisible && !isOwner && !isManager) return null;

  return { ...asset, isOwner, viewerIsManager: isManager, publiclyVisible };
}

export type AssetDetail = NonNullable<Awaited<ReturnType<typeof getAssetForViewer>>>;

export async function getFeaturedAssets(limit = 3) {
  return db.asset.findMany({
    where: { status: AssetStatus.PUBLISHED, seller: { status: UserStatus.ACTIVE } },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }],
    take: limit,
    select: listSelect,
  });
}

export async function getMarketplaceStats() {
  const [assets, buyers, jurisdictions] = await Promise.all([
    db.asset.count({
      where: { status: AssetStatus.PUBLISHED, seller: { status: UserStatus.ACTIVE } },
    }),
    db.buyerProfile.count({ where: { user: { status: UserStatus.ACTIVE } } }),
    db.asset.findMany({
      where: { status: AssetStatus.PUBLISHED, seller: { status: UserStatus.ACTIVE } },
      select: { jurisdiction: true },
      distinct: ["jurisdiction"],
    }),
  ]);
  return { assets, buyers, jurisdictions: jurisdictions.length };
}

export async function getSellerAssetStats(sellerId: string) {
  const [total, published, drafts] = await Promise.all([
    db.asset.count({ where: { sellerId } }),
    db.asset.count({ where: { sellerId, status: AssetStatus.PUBLISHED } }),
    db.asset.count({ where: { sellerId, status: AssetStatus.DRAFT } }),
  ]);
  return { total, published, drafts };
}

/** Published assets of active sellers — the candidate pool for buyer matching. */
export async function getMatchableAssets(limit = 60) {
  return db.asset.findMany({
    where: { status: AssetStatus.PUBLISHED, seller: { status: UserStatus.ACTIVE } },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }],
    take: limit,
    select: {
      ...listSelect,
      description: true,
    },
  });
}
