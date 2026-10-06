import { NextResponse } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { draftMessage } from "@/lib/ai/features/draft-message";
import { getLocale } from "@/i18n/server";
import { formatMoney } from "@/lib/format";

const schema = z.object({
  counterpartyId: z.string().min(1),
  assetId: z.string().optional(),
  direction: z.enum(["buyerToSeller", "sellerToBuyer"]),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role === Role.MANAGER) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  // The direction has to match the caller's actual role — otherwise a buyer
  // could harvest seller-side prompts (and vice versa).
  const expected = user.role === Role.BUYER ? "buyerToSeller" : "sellerToBuyer";
  if (parsed.data.direction !== expected) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { allowed } = checkRateLimit(`draft:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const counterparty = await db.user.findUnique({
    where: { id: parsed.data.counterpartyId },
    select: {
      id: true,
      name: true,
      status: true,
      role: true,
      buyerProfile: true,
      sellerProfile: { select: { companyName: true } },
    },
  });
  if (!counterparty || counterparty.status !== UserStatus.ACTIVE) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const asset = parsed.data.assetId
    ? await db.asset.findUnique({
        where: { id: parsed.data.assetId },
        select: {
          title: true,
          sector: true,
          jurisdiction: true,
          licenseType: true,
          askingPrice: true,
          currency: true,
          revenue: true,
          ebitda: true,
          summary: true,
        },
      })
    : null;

  const locale = await getLocale();
  const [senderBuyer, senderSeller] = await Promise.all([
    user.role === Role.BUYER ? db.buyerProfile.findUnique({ where: { userId: user.id } }) : null,
    user.role === Role.SELLER
      ? db.sellerProfile.findUnique({ where: { userId: user.id }, select: { companyName: true } })
      : null,
  ]);

  const mandate = user.role === Role.BUYER ? senderBuyer : counterparty.buyerProfile;

  const result = await draftMessage(
    {
      direction: parsed.data.direction,
      senderName: user.name,
      senderCompany: senderBuyer?.companyName ?? senderSeller?.companyName ?? "",
      recipientName: counterparty.name,
      assetTitle: asset?.title ?? null,
      assetFacts: asset
        ? [
            `${asset.sector}, ${asset.jurisdiction}`,
            asset.licenseType ? `licence: ${asset.licenseType}` : "",
            asset.askingPrice ? `asking ${formatMoney(asset.askingPrice, asset.currency)}` : "price on request",
            asset.revenue ? `revenue ${formatMoney(asset.revenue, asset.currency)}` : "",
            asset.ebitda !== null ? `EBITDA ${formatMoney(asset.ebitda, asset.currency)}` : "",
            asset.summary,
          ]
            .filter(Boolean)
            .join("; ")
        : "",
      mandateFacts: mandate
        ? [
            mandate.sectors.join(", "),
            mandate.geographies.join(", "),
            mandate.ticketMin || mandate.ticketMax
              ? `ticket ${mandate.ticketMin ?? 0}-${mandate.ticketMax ?? "open"} ${mandate.currency}`
              : "",
            mandate.thesis,
          ]
            .filter(Boolean)
            .join("; ")
        : "",
    },
    locale,
  );

  return NextResponse.json(result);
}
