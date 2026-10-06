import { Suspense } from "react";
import { Role } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { getBuyerByUserId } from "@/lib/queries/buyers";
import { getMatchableAssets } from "@/lib/queries/assets";
import { mandateCompleteness, rankMatches } from "@/lib/matching/score";
import { explainMatches } from "@/lib/ai/features/match";
import { aiEnabled } from "@/lib/env";
import { AssetCard } from "@/components/assets/asset-card";
import { MatchExplainer } from "@/components/ai/match-explainer";
import { Badge, EmptyState, PageHeader } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Matches — N5Deal" };

const SHORTLIST = 9;

export default async function BuyerMatchesPage() {
  const { d } = await getI18n();
  const user = await requireRole(Role.BUYER);
  const mandate = await getBuyerByUserId(user.id);

  // An empty mandate cannot be matched against — say so instead of rendering an
  // arbitrary list that would look like a recommendation.
  if (!mandate || mandateCompleteness(mandate) < 40) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader title={d.ai.matchAssetsTitle} subtitle={d.ai.matchAssetsSubtitle} />
        <div className="mt-6">
          <EmptyState
            title={d.buyers.noMandateTitle}
            body={d.buyers.noMandateBody}
            action={
              <ButtonLink href="/buyer/profile" size="sm">
                {d.dashboard.completeMandate}
              </ButtonLink>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title={d.ai.matchAssetsTitle}
        subtitle={d.ai.matchAssetsSubtitle}
        actions={aiEnabled() ? null : <Badge tone="warning">{d.ai.heuristicMode}</Badge>}
      />
      <Suspense
        fallback={
          <p className="mt-8 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            {d.common.loading}
          </p>
        }
      >
        <Matches userId={user.id} />
      </Suspense>
    </div>
  );
}

async function Matches({ userId }: { userId: string }) {
  const { d, locale } = await getI18n();
  const mandate = await getBuyerByUserId(userId);
  if (!mandate) return null;

  const assets = await getMatchableAssets();
  const mandateInput = {
    sectors: mandate.sectors,
    geographies: mandate.geographies,
    dealTypes: mandate.dealTypes,
    ticketMin: mandate.ticketMin,
    ticketMax: mandate.ticketMax,
    thesis: mandate.thesis,
  };

  const shortlist = rankMatches(assets, (asset) => ({ asset, mandate: mandateInput }), SHORTLIST);

  if (shortlist.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState title={d.ai.noMatches} body={d.assets.emptyBody} />
      </div>
    );
  }

  const rationales = await explainMatches({
    subject: [
      `Buyer: ${mandate.companyName} (${mandate.investorType}, ${mandate.country})`,
      `Sectors: ${mandate.sectors.join(", ") || "any"}`,
      `Geographies: ${mandate.geographies.join(", ") || "any"}`,
      `Deal types: ${mandate.dealTypes.join(", ") || "any"}`,
      `Ticket: ${mandate.ticketMin ?? 0}-${mandate.ticketMax ?? "open"} ${mandate.currency}`,
      `Thesis: ${mandate.thesis}`,
    ].join("\n"),
    candidates: shortlist.map((entry) => ({
      id: entry.candidate.id,
      baseScore: entry.score,
      profile: [
        entry.candidate.title,
        `${entry.candidate.sector}, ${entry.candidate.jurisdiction}`,
        entry.candidate.licenseType ? `licence ${entry.candidate.licenseType}` : "no licence",
        `${entry.candidate.dealType}`,
        `price ${entry.candidate.askingPrice ?? "on request"} ${entry.candidate.currency}`,
        `revenue ${entry.candidate.revenue ?? "n/d"}`,
        entry.candidate.summary,
      ].join(" | "),
    })),
    locale,
  });

  const ranked = shortlist
    .map((entry) => ({
      ...entry,
      finalScore: rationales.byId[entry.candidate.id]?.score ?? entry.score,
      reason: rationales.byId[entry.candidate.id]?.reason ?? null,
    }))
    .sort((a, b) => b.finalScore - a.finalScore);

  return (
    <div className="mt-6 flex flex-col gap-4">
      {rationales.source === "heuristic" ? (
        <p className="text-xs text-muted">{d.ai.heuristicHint}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ranked.map(({ candidate, factors, finalScore, reason }) => (
          <AssetCard
            key={candidate.id}
            asset={candidate}
            d={d}
            locale={locale}
            footer={<MatchExplainer d={d} score={finalScore} factors={factors} reason={reason} />}
          />
        ))}
      </div>
    </div>
  );
}
