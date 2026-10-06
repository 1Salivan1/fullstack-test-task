"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AssetStatus, Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import { markConversationRead } from "@/lib/queries/messages";
import type { ActionState } from "./types";

const bodySchema = z.string().trim().min(2).max(4000);

/**
 * Resolves the (buyer, seller) pair for a new thread from the sender's role, and
 * refuses every combination the marketplace does not allow:
 *  - messaging yourself;
 *  - a manager starting a deal conversation (they moderate, they do not trade);
 *  - a counterparty with the wrong role, suspended, or removed;
 *  - an asset that does not belong to the seller in the thread.
 */
async function resolveParticipants(senderId: string, senderRole: Role, counterpartyId: string) {
  if (senderId === counterpartyId) return null;
  if (senderRole === Role.MANAGER) return null;

  const counterparty = await db.user.findUnique({
    where: { id: counterpartyId },
    select: { id: true, role: true, status: true },
  });
  if (!counterparty || counterparty.status !== UserStatus.ACTIVE) return null;

  if (senderRole === Role.BUYER && counterparty.role === Role.SELLER) {
    return { buyerId: senderId, sellerId: counterparty.id };
  }
  if (senderRole === Role.SELLER && counterparty.role === Role.BUYER) {
    return { buyerId: counterparty.id, sellerId: senderId };
  }
  return null;
}

export async function startConversationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const { d } = await getI18n();

  const counterpartyId = String(formData.get("counterpartyId") ?? "");
  const assetIdRaw = String(formData.get("assetId") ?? "");
  const parsedBody = bodySchema.safeParse(formData.get("body"));
  if (!parsedBody.success) return { fieldErrors: { body: d.validation.required } };

  const participants = await resolveParticipants(user.id, user.role, counterpartyId);
  if (!participants) return { error: d.messages.cannotMessage };

  let assetId: string | null = null;
  if (assetIdRaw) {
    const asset = await db.asset.findUnique({
      where: { id: assetIdRaw },
      select: { id: true, sellerId: true, status: true },
    });
    if (!asset || asset.sellerId !== participants.sellerId) return { error: d.messages.cannotMessage };
    if (asset.status === AssetStatus.SUSPENDED) return { error: d.messages.cannotMessage };
    assetId = asset.id;
  }

  const now = new Date();
  const existing = await db.conversation.findFirst({
    where: { assetId, buyerId: participants.buyerId, sellerId: participants.sellerId },
    select: { id: true },
  });

  const conversation =
    existing ??
    (await db.conversation.create({
      data: { assetId, ...participants, lastMessageAt: now },
      select: { id: true },
    }));

  await db.$transaction([
    db.message.create({
      data: { conversationId: conversation.id, senderId: user.id, body: parsedBody.data },
    }),
    db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now } }),
  ]);

  revalidatePath("/messages");
  redirect(`/messages/${conversation.id}`);
}

export async function sendMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const { d } = await getI18n();

  const conversationId = String(formData.get("conversationId") ?? "");
  const parsedBody = bodySchema.safeParse(formData.get("body"));
  if (!parsedBody.success) return { fieldErrors: { body: d.validation.required } };

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      buyer: { select: { status: true } },
      seller: { select: { status: true } },
    },
  });
  if (!conversation) return { error: d.messages.cannotMessage };
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    return { error: d.messages.cannotMessage };
  }

  const counterpartyStatus =
    conversation.buyerId === user.id ? conversation.seller.status : conversation.buyer.status;
  if (counterpartyStatus !== UserStatus.ACTIVE) {
    return { error: d.messages.counterpartySuspended };
  }

  const now = new Date();
  await db.$transaction([
    db.message.create({
      data: { conversationId, senderId: user.id, body: parsedBody.data },
    }),
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
  ]);

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return {};
}

export async function markReadAction(conversationId: string): Promise<void> {
  const user = await requireUser();
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { buyerId: true, sellerId: true },
  });
  if (!conversation) return;
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) return;

  await markConversationRead(conversationId, user.id);
  revalidatePath("/messages");
}
