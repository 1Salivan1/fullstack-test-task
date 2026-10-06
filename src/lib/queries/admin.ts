import { AssetStatus, Prisma, Role, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { readList, readPage, readString, type RawSearchParams } from "@/lib/filters/search-params";

export const PARTICIPANTS_PER_PAGE = 15;

export type ParticipantFilters = {
  q: string;
  roles: Role[];
  statuses: UserStatus[];
  page: number;
};

export function parseParticipantFilters(params: RawSearchParams): ParticipantFilters {
  const roles = readList(params, "role").filter((value): value is Role =>
    Object.values(Role).includes(value as Role),
  );
  const statuses = readList(params, "status").filter((value): value is UserStatus =>
    Object.values(UserStatus).includes(value as UserStatus),
  );
  return { q: readString(params, "q").slice(0, 120), roles, statuses, page: readPage(params) };
}

export async function listParticipants(filters: ParticipantFilters) {
  const and: Prisma.UserWhereInput[] = [];
  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { buyerProfile: { companyName: { contains: filters.q, mode: "insensitive" } } },
        { sellerProfile: { companyName: { contains: filters.q, mode: "insensitive" } } },
      ],
    });
  }
  if (filters.roles.length) and.push({ role: { in: filters.roles } });
  if (filters.statuses.length) and.push({ status: { in: filters.statuses } });

  const where: Prisma.UserWhereInput = and.length ? { AND: and } : {};
  const take = PARTICIPANTS_PER_PAGE;

  const [total, items] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      skip: (filters.page - 1) * take,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        buyerProfile: { select: { companyName: true, verified: true } },
        sellerProfile: { select: { companyName: true, verified: true } },
        _count: { select: { assets: true } },
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / take));
  return { items, total, pageCount, page: Math.min(filters.page, pageCount) };
}

export type ParticipantListItem = Awaited<ReturnType<typeof listParticipants>>["items"][number];

export async function getAdminOverview() {
  const [buyers, sellers, assets, published, suspendedUsers, conversations, actions] =
    await Promise.all([
      db.user.count({ where: { role: Role.BUYER } }),
      db.user.count({ where: { role: Role.SELLER } }),
      db.asset.count(),
      db.asset.count({ where: { status: AssetStatus.PUBLISHED } }),
      db.user.count({ where: { status: { in: [UserStatus.SUSPENDED, UserStatus.REMOVED] } } }),
      db.conversation.count(),
      db.moderationAction.count(),
    ]);
  return { buyers, sellers, assets, published, suspendedUsers, conversations, actions };
}

export async function listModerationActions(limit = 50) {
  return db.moderationAction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      reason: true,
      createdAt: true,
      manager: { select: { name: true } },
      targetUser: { select: { id: true, name: true, role: true } },
      targetAsset: { select: { id: true, title: true } },
    },
  });
}

export type ModerationLogItem = Awaited<ReturnType<typeof listModerationActions>>[number];
