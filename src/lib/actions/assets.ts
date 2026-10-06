"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AssetStatus, DealType, Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import { currencySchema, jurisdictionSchema, licenseSchema, sectorSchema } from "@/lib/taxonomy";
import type { ActionState } from "./types";

/** Empty inputs mean "not disclosed", which is a null column, not a zero. */
const optionalInt = z
  .union([z.string(), z.number(), z.null()])
  .transform((value) => {
    if (value === null) return null;
    const raw = String(value).replace(/[\s_,]/g, "");
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  });

const assetSchema = z.object({
  title: z.string().trim().min(8).max(160),
  summary: z.string().trim().min(10).max(220),
  description: z.string().trim().max(8000).default(""),
  sector: sectorSchema,
  jurisdiction: jurisdictionSchema,
  licenseType: z.union([licenseSchema, z.literal("")]).default(""),
  dealType: z.nativeEnum(DealType),
  currency: currencySchema.default("EUR"),
  askingPrice: optionalInt,
  revenue: optionalInt,
  ebitda: optionalInt,
  employees: optionalInt,
  foundedYear: optionalInt,
  highlights: z.string().default(""),
});

function parseHighlights(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function readForm(formData: FormData) {
  return assetSchema.safeParse({
    title: formData.get("title") ?? "",
    summary: formData.get("summary") ?? "",
    description: formData.get("description") ?? "",
    sector: formData.get("sector") ?? "",
    jurisdiction: formData.get("jurisdiction") ?? "",
    licenseType: formData.get("licenseType") ?? "",
    dealType: formData.get("dealType") ?? "",
    currency: formData.get("currency") ?? "EUR",
    askingPrice: formData.get("askingPrice"),
    revenue: formData.get("revenue"),
    ebitda: formData.get("ebitda"),
    employees: formData.get("employees"),
    foundedYear: formData.get("foundedYear"),
    highlights: formData.get("highlights") ?? "",
  });
}

async function fieldErrorsFor(issues: z.ZodIssue[]): Promise<Record<string, string>> {
  const { d } = await getI18n();
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (issue.code === "too_small" && "minimum" in issue) {
      errors[key] = d.validation.tooShort(Number(issue.minimum));
    } else if (issue.code === "invalid_value") {
      errors[key] = d.validation.unknownValue;
    } else {
      errors[key] = d.validation.required;
    }
  }
  return errors;
}

export async function createAssetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(Role.SELLER);
  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: await fieldErrorsFor(parsed.error.issues) };

  const publish = formData.get("publish") === "on";
  const data = parsed.data;

  const asset = await db.asset.create({
    data: {
      sellerId: user.id,
      ...data,
      highlights: parseHighlights(data.highlights),
      status: publish ? AssetStatus.PUBLISHED : AssetStatus.DRAFT,
      publishedAt: publish ? new Date() : null,
    },
  });

  revalidatePath("/seller/assets");
  revalidatePath("/assets");
  redirect(`/seller/assets/${asset.id}/edit?saved=1`);
}

export async function updateAssetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(Role.SELLER);
  const assetId = String(formData.get("assetId") ?? "");
  const existing = await db.asset.findUnique({ where: { id: assetId }, select: { sellerId: true, status: true } });
  // Ownership is re-checked here, not only in the page that rendered the form.
  if (!existing || existing.sellerId !== user.id) {
    const { d } = await getI18n();
    return { error: d.errors.forbidden };
  }

  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: await fieldErrorsFor(parsed.error.issues) };

  const publish = formData.get("publish") === "on";
  const data = parsed.data;
  const shouldPublish = publish && existing.status === AssetStatus.DRAFT;

  await db.asset.update({
    where: { id: assetId },
    data: {
      ...data,
      highlights: parseHighlights(data.highlights),
      ...(shouldPublish ? { status: AssetStatus.PUBLISHED, publishedAt: new Date() } : {}),
    },
  });

  revalidatePath("/seller/assets");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");

  const { d } = await getI18n();
  return { success: shouldPublish ? d.assets.published : d.assets.savedDraft };
}

const statusSchema = z.enum([AssetStatus.PUBLISHED, AssetStatus.DRAFT, AssetStatus.ARCHIVED]);

/**
 * Sellers control PUBLISHED / DRAFT / ARCHIVED. They deliberately cannot set or
 * clear SUSPENDED — that transition belongs to platform managers only.
 */
export async function setAssetStatusAction(formData: FormData): Promise<void> {
  const user = await requireRole(Role.SELLER);
  const assetId = String(formData.get("assetId") ?? "");
  const parsedStatus = statusSchema.safeParse(formData.get("status"));
  if (!parsedStatus.success) return;

  const existing = await db.asset.findUnique({
    where: { id: assetId },
    select: { sellerId: true, status: true, publishedAt: true },
  });
  if (!existing || existing.sellerId !== user.id) return;
  if (existing.status === AssetStatus.SUSPENDED) return;

  const status = parsedStatus.data;
  await db.asset.update({
    where: { id: assetId },
    data: {
      status,
      publishedAt:
        status === AssetStatus.PUBLISHED ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
    },
  });

  revalidatePath("/seller/assets");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
}
