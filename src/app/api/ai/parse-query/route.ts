import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { interpretAssetQuery } from "@/lib/ai/features/parse-query";
import { aiEnabled } from "@/lib/env";

const schema = z.object({ query: z.string().min(1).max(500) });

/**
 * Smart search is available to anonymous visitors too (browsing assets does not
 * require an account), so the rate-limit key falls back to the client IP.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const user = await getCurrentUser();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { allowed, retryAfterMs } = checkRateLimit(`parse-query:${user?.id ?? ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const { filters, source } = await interpretAssetQuery(parsed.data.query);
  return NextResponse.json({ filters, source, aiConfigured: aiEnabled() });
}
