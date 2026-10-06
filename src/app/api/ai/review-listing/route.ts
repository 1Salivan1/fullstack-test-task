import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { reviewListing } from "@/lib/ai/features/review-listing";
import { getLocale } from "@/i18n/server";

const toNumber = (value: unknown) => {
  const raw = String(value ?? "").replace(/[\s_,]/g, "");
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Accepts the raw listing form, so a draft can be reviewed before it is saved. */
const schema = z.object({
  title: z.string().max(300).optional().default(""),
  summary: z.string().max(500).optional().default(""),
  description: z.string().max(10000).optional().default(""),
  sector: z.string().max(80).optional().default(""),
  jurisdiction: z.string().max(80).optional().default(""),
  licenseType: z.string().max(80).optional().default(""),
  dealType: z.string().max(40).optional().default(""),
  currency: z.string().max(8).optional().default("EUR"),
  askingPrice: z.unknown().transform(toNumber),
  revenue: z.unknown().transform(toNumber),
  ebitda: z.unknown().transform(toNumber),
  employees: z.unknown().transform(toNumber),
  foundedYear: z.unknown().transform(toNumber),
  highlights: z.string().max(2000).optional().default(""),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.SELLER) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`review:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const locale = await getLocale();
  const data = parsed.data;

  const review = await reviewListing(
    {
      ...data,
      highlights: data.highlights
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    },
    locale,
  );

  return NextResponse.json(review);
}
