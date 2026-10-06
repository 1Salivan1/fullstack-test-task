"use server";

import { revalidatePath } from "next/cache";
import { AssetStatus, ModerationActionType, Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import type { ActionState } from "./types";

const schema = z.object({
  action: z.nativeEnum(ModerationActionType),
  reason: z.string().trim().min(8).max(500),
  targetUserId: z.string().optional().default(""),
  targetAssetId: z.string().optional().default(""),
});

/**
 * Moderation is recorded before it is applied, in one transaction: the audit log
 * and the state change cannot diverge. Nothing is deleted — a removed
 * participant becomes invisible to the marketplace but stays referenced by the
 * log and by existing conversations.
 */
export async function moderateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const manager = await requireRole(Role.MANAGER);
  const { d } = await getI18n();

  const parsed = schema.safeParse({
    action: formData.get("action"),
    reason: formData.get("reason"),
    targetUserId: formData.get("targetUserId") ?? "",
    targetAssetId: formData.get("targetAssetId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: { reason: d.admin.reasonRequired } };

  const { action, reason, targetUserId, targetAssetId } = parsed.data;
  if (!targetUserId && !targetAssetId) return { error: d.common.somethingWentWrong };

  if (targetUserId) {
    const target = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    });
    if (!target) return { error: d.errors.notFound };
    // Managers moderate participants, not each other.
    if (target.role === Role.MANAGER) return { error: d.errors.forbidden };

    const status =
      action === ModerationActionType.REINSTATE
        ? UserStatus.ACTIVE
        : action === ModerationActionType.REMOVE
          ? UserStatus.REMOVED
          : UserStatus.SUSPENDED;

    await db.$transaction([
      db.moderationAction.create({
        data: { managerId: manager.id, action, reason, targetUserId: target.id },
      }),
      db.user.update({ where: { id: target.id }, data: { status } }),
    ]);
  }

  if (targetAssetId) {
    const target = await db.asset.findUnique({
      where: { id: targetAssetId },
      select: { id: true, status: true },
    });
    if (!target) return { error: d.errors.notFound };

    const status =
      action === ModerationActionType.REINSTATE
        ? AssetStatus.PUBLISHED
        : action === ModerationActionType.REMOVE
          ? AssetStatus.ARCHIVED
          : AssetStatus.SUSPENDED;

    await db.$transaction([
      db.moderationAction.create({
        data: { managerId: manager.id, action, reason, targetAssetId: target.id },
      }),
      db.asset.update({ where: { id: target.id }, data: { status } }),
    ]);
    revalidatePath(`/assets/${target.id}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/assets");
  revalidatePath("/admin/moderation");
  revalidatePath("/assets");
  revalidatePath("/buyers");
  return { success: d.admin.done };
}
