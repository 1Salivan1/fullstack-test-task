import { Role } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Conversation access rule, in one place: a participant sees their own threads,
 * a platform manager sees none of them. Reading private deal correspondence is
 * not part of the moderation mandate in the brief, so the prototype does not
 * grant it — managers moderate on listings and profiles instead.
 */
export async function listConversations(userId: string) {
  const conversations = await db.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true,
      lastMessageAt: true,
      buyer: { select: { id: true, name: true, status: true, buyerProfile: { select: { companyName: true, visibility: true } } } },
      seller: { select: { id: true, name: true, status: true, sellerProfile: { select: { companyName: true } } } },
      asset: { select: { id: true, title: true, status: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
      _count: {
        select: { messages: { where: { readAt: null, NOT: { senderId: userId } } } },
      },
    },
  });

  return conversations.map((conversation) => {
    const isBuyer = conversation.buyer.id === userId;
    const counterparty = isBuyer ? conversation.seller : conversation.buyer;
    const company = isBuyer
      ? conversation.seller.sellerProfile?.companyName
      : conversation.buyer.buyerProfile?.companyName;
    return {
      id: conversation.id,
      assetId: conversation.asset?.id ?? null,
      assetTitle: conversation.asset?.title ?? null,
      lastMessageAt: conversation.lastMessageAt,
      lastMessage: conversation.messages[0] ?? null,
      unread: conversation._count.messages,
      counterparty: {
        id: counterparty.id,
        name: counterparty.name,
        status: counterparty.status,
        company: company ?? "",
      },
      viewerRole: isBuyer ? Role.BUYER : Role.SELLER,
    };
  });
}

export type ConversationListItem = Awaited<ReturnType<typeof listConversations>>[number];

export async function getConversationForUser(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      buyer: {
        select: { id: true, name: true, status: true, buyerProfile: { select: { companyName: true } } },
      },
      seller: {
        select: { id: true, name: true, status: true, sellerProfile: { select: { companyName: true } } },
      },
      asset: { select: { id: true, title: true, status: true, askingPrice: true, currency: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) return null;
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) return null;

  const isBuyer = conversation.buyerId === userId;
  const counterparty = isBuyer ? conversation.seller : conversation.buyer;
  const counterpartyCompany = isBuyer
    ? conversation.seller.sellerProfile?.companyName
    : conversation.buyer.buyerProfile?.companyName;

  return {
    ...conversation,
    isBuyer,
    counterparty: { ...counterparty, company: counterpartyCompany ?? "" },
  };
}

export async function countUnread(userId: string) {
  return db.message.count({
    where: {
      readAt: null,
      NOT: { senderId: userId },
      conversation: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    },
  });
}

export async function markConversationRead(conversationId: string, userId: string) {
  await db.message.updateMany({
    where: { conversationId, readAt: null, NOT: { senderId: userId } },
    data: { readAt: new Date() },
  });
}

/** Existing thread between these parties about this asset, if any. */
export async function findConversation(args: {
  assetId: string | null;
  buyerId: string;
  sellerId: string;
}) {
  return db.conversation.findFirst({
    where: { assetId: args.assetId, buyerId: args.buyerId, sellerId: args.sellerId },
    select: { id: true },
  });
}
