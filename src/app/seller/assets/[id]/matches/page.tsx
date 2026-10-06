import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Role, Visibility } from "@prisma/client";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getMatchableBuyers } from "@/lib/queries/buyers";
import { rankMatches } from "@/lib/matching/score";
import { explainMatches } from "@/lib/ai/features/match";
import { aiEnabled } from "@/lib/env";
import { formatRange } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/display";
import { buttonClass } from "@/components/ui/button";
import { MatchExplainer } from "@/components/ai/match-explainer";

export const metadata = { title: "Matching buyers — N5Deal" };

const SHORTLIST = 8;

export default async function AssetMatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d } = await getI18n();
  const user = await requireRole(Role.SELLER);

  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset || asset.sellerId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href={`/seller/assets/${asset.id}/edit`} className="text-xs text-muted hover:text-ink">
        ← {d.assets.editListing}
      </Link>
      <div className="mt-3">
        <PageHeader
          title={d.ai.matchBuyersTitle}
          subtitle={d.ai.matchBuyersSubtitle(asset.title)}
          actions={aiEnabled() ? null : <Badge tone="warning">{d.ai.heuristicMode}</Badge>}
        />
      </div>

      <Suspense
        fallback={
          <p className="mt-8 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            {d.common.loading}
          </p>
        }
      >
        <MatchList assetId={asset.id} />
      </Suspense>
    </div>
  );
}

async function MatchList({ assetId }: { assetId: string }) {
  const { d, locale } = await getI18n();
  const asset = await db.asset.findUniqueOrThrow({ where: { id: assetId } });
  const buyers = await getMatchableBuyers();

  // Rules first: they pick the shortlist, so the model only ever sees a handful
  // of candidates (cheap, and inside the free-tier token budget).
  const shortlist = rankMatches(
    buyers,
    (buyer) => ({
      asset,
      mandate: {
        sectors: buyer.sectors,
        geographies: buyer.geographies,
        dealTypes: buyer.dealTypes,
        ticketMin: buyer.ticketMin,
        ticketMax: buyer.ticketMax,
        thesis: buyer.thesis,
      },
    }),
    SHORTLIST,
  );

  if (shortlist.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState title={d.ai.noMatches} body={d.buyers.emptyBody} />
      </div>
    );
  }

  const rationales = await explainMatches({
    subject: [
      `Asset: ${asset.title}`,
      `Sector: ${asset.sector}; jurisdiction: ${asset.jurisdiction}; licence: ${asset.licenseType || "none"}`,
      `Deal type: ${asset.dealType}; asking price: ${asset.askingPrice ?? "on request"} ${asset.currency}`,
      `Revenue: ${asset.revenue ?? "n/d"}; EBITDA: ${asset.ebitda ?? "n/d"}`,
      `Summary: ${asset.summary}`,
    ].join("\n"),
    candidates: shortlist.map((entry) => ({
      id: entry.candidate.userId,
      baseScore: entry.score,
      profile: [
        entry.candidate.visibility === Visibility.ANONYMOUS
          ? "anonymous buyer"
          : entry.candidate.companyName,
        entry.candidate.investorType,
        `sectors: ${entry.candidate.sectors.join(", ") || "any"}`,
        `geographies: ${entry.candidate.geographies.join(", ") || "any"}`,
        `ticket: ${entry.candidate.ticketMin ?? 0}-${entry.candidate.ticketMax ?? "open"} ${entry.candidate.currency}`,
        `thesis: ${entry.candidate.thesis.slice(0, 300)}`,
      ].join(" | "),
    })),
    locale,
  });

  const ranked = shortlist
    .map((entry) => ({
      ...entry,
      finalScore: rationales.byId[entry.candidate.userId]?.score ?? entry.score,
      reason: rationales.byId[entry.candidate.userId]?.reason ?? null,
    }))
    .sort((a, b) => b.finalScore - a.finalScore);

  return (
    <div className="mt-6 flex flex-col gap-4">
      {rationales.source === "heuristic" ? (
        <p className="text-xs text-muted">{d.ai.heuristicHint}</p>
      ) : null}

      {ranked.map(({ candidate, factors, finalScore, reason }) => {
        const anonymous = candidate.visibility === Visibility.ANONYMOUS;
        return (
          <Card key={candidate.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  {anonymous ? d.buyers.anonymous : candidate.companyName}
                </h2>
                <p className="text-xs text-muted">
                  {d.investorTypes[candidate.investorType]} · {candidate.country} ·{" "}
                  {formatRange(candidate.ticketMin, candidate.ticketMax, candidate.currency, locale)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/buyers/${candidate.userId}`} className={buttonClass("secondary", "sm")}>
                  {d.buyers.viewProfile}
                </Link>
                <Link
                  href={`/buyers/${candidate.userId}#contact`}
                  className={buttonClass("primary", "sm")}
                >
                  <MessageSquarePlus className="size-4" />
                  {d.buyers.contactBuyer}
                </Link>
              </div>
            </div>

            <MatchExplainer d={d} score={finalScore} factors={factors} reason={reason} />

            {candidate.thesis ? (
              <p className="line-clamp-3 text-sm text-muted">{candidate.thesis}</p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
