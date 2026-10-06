import Link from "next/link";
import { Role } from "@prisma/client";
import { ArrowRight, MessageSquare, Plus, Sparkles } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { getSellerAssetStats } from "@/lib/queries/assets";
import { getBuyerByUserId } from "@/lib/queries/buyers";
import { countUnread, listConversations } from "@/lib/queries/messages";
import { getAdminOverview } from "@/lib/queries/admin";
import { mandateCompleteness } from "@/lib/matching/score";
import { formatDateTime } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, ScoreBar, Stat } from "@/components/ui/display";

export const metadata = { title: "Dashboard — N5Deal" };

export default async function DashboardPage() {
  const { d, locale } = await getI18n();
  const user = await requireUser();

  if (user.role === Role.MANAGER) {
    const overview = await getAdminOverview();
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader
          title={d.dashboard.title(user.name)}
          subtitle={d.dashboard.managerSubtitle}
          actions={<ButtonLink href="/admin">{d.nav.admin}</ButtonLink>}
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={d.admin.totalBuyers} value={overview.buyers} />
          <Stat label={d.admin.totalSellers} value={overview.sellers} />
          <Stat label={d.admin.publishedAssets} value={`${overview.published}/${overview.assets}`} />
          <Stat label={d.admin.suspendedUsers} value={overview.suspendedUsers} />
        </div>
      </div>
    );
  }

  const [conversations, unread] = await Promise.all([
    listConversations(user.id),
    countUnread(user.id),
  ]);

  const sellerStats = user.role === Role.SELLER ? await getSellerAssetStats(user.id) : null;
  const mandate = user.role === Role.BUYER ? await getBuyerByUserId(user.id) : null;
  const completeness = mandate ? mandateCompleteness(mandate) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title={d.dashboard.title(user.name)}
        subtitle={user.role === Role.SELLER ? d.dashboard.sellerSubtitle : d.dashboard.buyerSubtitle}
        actions={
          user.role === Role.SELLER ? (
            <>
              <ButtonLink href="/seller/assets/new">
                <Plus className="size-4" />
                {d.assets.newListing}
              </ButtonLink>
              <ButtonLink href="/buyers" variant="secondary">
                {d.nav.buyers}
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/buyer/matches">
                <Sparkles className="size-4" />
                {d.nav.matches}
              </ButtonLink>
              <ButtonLink href="/assets" variant="secondary">
                {d.nav.assets}
              </ButtonLink>
            </>
          )
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sellerStats ? (
          <>
            <Stat label={d.dashboard.listings} value={sellerStats.total} />
            <Stat label={d.dashboard.published} value={sellerStats.published} />
            <Stat label={d.dashboard.drafts} value={sellerStats.drafts} />
          </>
        ) : (
          <>
            <Stat label={d.dashboard.mandateComplete} value={`${completeness}%`} />
            <Stat label={d.buyers.sectors} value={mandate?.sectors.length ?? 0} />
            <Stat label={d.buyers.geographies} value={mandate?.geographies.length ?? 0} />
          </>
        )}
        <Stat label={d.dashboard.unread} value={unread} hint={`${conversations.length} ${d.dashboard.conversations.toLowerCase()}`} />
      </div>

      {user.role === Role.BUYER && completeness < 100 ? (
        <Card className="mt-6 flex flex-col gap-3 border-accent/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">{d.dashboard.completeMandate}</h2>
              <p className="mt-1 max-w-xl text-sm text-muted">{d.dashboard.completeMandateBody}</p>
            </div>
            <ButtonLink href="/buyer/profile" size="sm">
              {d.nav.mandate}
              <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
          <ScoreBar value={completeness} label={d.dashboard.mandateComplete} />
        </Card>
      ) : null}

      {user.role === Role.SELLER && sellerStats?.total === 0 ? (
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 border-accent/40">
          <div>
            <h2 className="text-base font-semibold text-ink">{d.dashboard.createFirstListing}</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">{d.dashboard.createFirstListingBody}</p>
          </div>
          <ButtonLink href="/seller/assets/new" size="sm">
            <Plus className="size-4" />
            {d.assets.newListing}
          </ButtonLink>
        </Card>
      ) : null}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {d.dashboard.recentActivity}
          </h2>
          <ButtonLink href="/messages" variant="ghost" size="sm">
            {d.nav.messages}
          </ButtonLink>
        </div>

        {conversations.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<MessageSquare className="size-6" />}
              title={d.messages.empty}
              body={d.messages.emptyHint}
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {conversations.slice(0, 5).map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {conversation.counterparty.company || conversation.counterparty.name}
                      {conversation.unread > 0 ? (
                        <span className="ml-2 text-xs text-accent">
                          {d.messages.unreadBadge(conversation.unread)}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {conversation.assetTitle ?? d.messages.generalEnquiry}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {formatDateTime(conversation.lastMessageAt, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
