"use server";

import { revalidatePath } from "next/cache";
import { DealType, InvestorType, Role, Visibility } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import { currencySchema, jurisdictionSchema, sectorSchema } from "@/lib/taxonomy";
import type { ActionState } from "./types";

const optionalInt = z.union([z.string(), z.number(), z.null()]).transform((value) => {
  if (value === null) return null;
  const raw = String(value).replace(/[\s_,]/g, "");
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
});

const mandateSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  country: z.string().trim().min(2).max(80),
  investorType: z.nativeEnum(InvestorType),
  thesis: z.string().trim().max(2000).default(""),
  timeline: z.string().trim().max(60).default(""),
  currency: currencySchema.default("EUR"),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  ticketMin: optionalInt,
  ticketMax: optionalInt,
});

export async function saveMandateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(Role.BUYER);
  const { d } = await getI18n();

  const parsed = mandateSchema.safeParse({
    companyName: formData.get("companyName") ?? "",
    country: formData.get("country") ?? "",
    investorType: formData.get("investorType") ?? "",
    thesis: formData.get("thesis") ?? "",
    timeline: formData.get("timeline") ?? "",
    currency: formData.get("currency") ?? "EUR",
    visibility: formData.get("visibility") ?? Visibility.PUBLIC,
    ticketMin: formData.get("ticketMin"),
    ticketMax: formData.get("ticketMax"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] = d.validation.required;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  const { ticketMin, ticketMax } = data;
  if (ticketMin !== null && ticketMax !== null && ticketMin > ticketMax) {
    return { fieldErrors: { ticketMax: d.validation.rangeInverted } };
  }

  // Unknown values coming from a tampered form are dropped rather than stored,
  // so the taxonomy stays the single source of truth for filters and matching.
  const sectors = formData
    .getAll("sectors")
    .map(String)
    .filter((value) => sectorSchema.safeParse(value).success);
  const geographies = formData
    .getAll("geographies")
    .map(String)
    .filter((value) => jurisdictionSchema.safeParse(value).success);
  const dealTypes = formData
    .getAll("dealTypes")
    .map(String)
    .filter((value): value is DealType => Object.values(DealType).includes(value as DealType));

  const payload = {
    companyName: data.companyName,
    country: data.country,
    investorType: data.investorType,
    thesis: data.thesis,
    timeline: data.timeline,
    currency: data.currency,
    visibility: data.visibility,
    ticketMin,
    ticketMax,
    sectors,
    geographies,
    dealTypes,
  };

  await db.buyerProfile.upsert({
    where: { userId: user.id },
    update: payload,
    create: { userId: user.id, ...payload },
  });

  revalidatePath("/buyer/profile");
  revalidatePath("/buyer/matches");
  revalidatePath("/buyers");
  return { success: d.buyers.mandateSaved };
}
