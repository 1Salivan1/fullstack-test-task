import { InvestorType, Role, Visibility } from "@prisma/client";
import { Sparkles } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { getBuyerByUserId } from "@/lib/queries/buyers";
import { mandateCompleteness } from "@/lib/matching/score";
import { MandateForm, type MandateValues } from "@/components/buyers/mandate-form";
import { PageHeader, ScoreBar } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "My mandate — N5Deal" };

export default async function BuyerProfilePage() {
  const { d } = await getI18n();
  const user = await requireRole(Role.BUYER);
  const profile = await getBuyerByUserId(user.id);

  const values: MandateValues = {
    companyName: profile?.companyName ?? "",
    country: profile?.country ?? "",
    investorType: profile?.investorType ?? InvestorType.STRATEGIC,
    thesis: profile?.thesis ?? "",
    sectors: profile?.sectors ?? [],
    geographies: profile?.geographies ?? [],
    dealTypes: profile?.dealTypes ?? [],
    ticketMin: profile?.ticketMin ?? null,
    ticketMax: profile?.ticketMax ?? null,
    currency: profile?.currency ?? "EUR",
    timeline: profile?.timeline ?? "",
    visibility: profile?.visibility ?? Visibility.PUBLIC,
  };

  const completeness = profile ? mandateCompleteness(profile) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title={d.buyers.mandateTitle}
        subtitle={d.buyers.mandateSubtitle}
        actions={
          <ButtonLink href="/buyer/matches" variant="secondary" size="sm">
            <Sparkles className="size-4" />
            {d.buyers.matchesCta}
          </ButtonLink>
        }
      />

      <div className="mt-4">
        <ScoreBar value={completeness} label={d.dashboard.mandateComplete} />
      </div>

      <div className="mt-6">
        <MandateForm values={values} />
      </div>
    </div>
  );
}
