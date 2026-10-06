import Link from "next/link";
import { notFound } from "next/navigation";
import { Role, UserStatus, Visibility } from "@prisma/client";
import { EyeOff, MapPin, ShieldCheck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { getBuyerProfileForViewer } from "@/lib/queries/buyers";
import { db } from "@/lib/db";
import { formatRange } from "@/lib/format";
import { Badge, Card, DataRow, PageHeader } from "@/components/ui/display";
import { ContactPanel } from "@/components/messages/contact-panel";
import { ModerationForm } from "@/components/admin/moderation-form";

export default async function BuyerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d, locale } = await getI18n();
  const viewer = await requireRole(Role.SELLER, Role.MANAGER);
  const buyer = await getBuyerProfileForViewer(id, viewer);

  if (!buyer) notFound();

  const anonymous = buyer.visibility === Visibility.ANONYMOUS;

  // An anonymous buyer's identity is revealed to a seller only once they have
  // actually engaged — i.e. a conversation exists between the two parties.
  const hasConversation =
    viewer.role === Role.SELLER
      ? (await db.conversation.count({ where: { sellerId: viewer.id, buyerId: buyer.userId } })) > 0
      : false;
  const revealIdentity = !anonymous || hasConversation || viewer.role === Role.MANAGER;
  const displayName = revealIdentity ? buyer.companyName : d.buyers.anonymous;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/buyers" className="text-xs text-muted hover:text-ink">
        ← {d.buyers.title}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge tone="accent">{d.investorTypes[buyer.investorType]}</Badge>
        {buyer.verified ? (
          <Badge>
            <ShieldCheck className="size-3" /> {d.common.verified}
          </Badge>
        ) : null}
        {anonymous ? (
          <Badge tone="warning">
            <EyeOff className="size-3" /> {d.visibility.ANONYMOUS}
          </Badge>
        ) : null}
        {buyer.user.status !== UserStatus.ACTIVE ? (
          <Badge tone="danger">{d.userStatus[buyer.user.status]}</Badge>
        ) : null}
      </div>

      <PageHeader
        title={displayName}
        subtitle={anonymous && !revealIdentity ? d.buyers.anonymousHint : undefined}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="text-sm font-semibold text-ink">{d.buyers.thesis}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
              {buyer.thesis || d.buyers.noMandateBody}
            </p>
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted">{d.buyers.sectors}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {buyer.sectors.length ? (
                  buyer.sectors.map((sector) => <Badge key={sector}>{sector}</Badge>)
                ) : (
                  <span className="text-sm text-muted">{d.common.any}</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted">{d.buyers.geographies}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {buyer.geographies.length ? (
                  buyer.geographies.map((geography) => <Badge key={geography}>{geography}</Badge>)
                ) : (
                  <span className="text-sm text-muted">{d.common.any}</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted">{d.buyers.dealTypes}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {buyer.dealTypes.length ? (
                  buyer.dealTypes.map((dealType) => (
                    <Badge key={dealType}>{d.dealTypes[dealType]}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted">{d.common.any}</span>
                )}
              </div>
            </div>
          </Card>

          {viewer.role === Role.SELLER && buyer.user.status === UserStatus.ACTIVE ? (
            <Card id="contact">
              <ContactPanel
                counterpartyId={buyer.userId}
                counterpartyName={revealIdentity ? buyer.user.name : d.buyers.anonymous}
                direction="sellerToBuyer"
              />
            </Card>
          ) : null}

          {viewer.role === Role.MANAGER ? (
            <Card>
              <h2 className="mb-2 text-sm font-semibold text-ink">{d.admin.moderate}</h2>
              <ModerationForm
                targetUserId={buyer.userId}
                canReinstate={buyer.user.status !== UserStatus.ACTIVE}
              />
            </Card>
          ) : null}
        </div>

        <aside>
          <Card>
            <dl>
              <DataRow
                label={d.buyers.ticket}
                value={formatRange(buyer.ticketMin, buyer.ticketMax, buyer.currency, locale)}
              />
              <DataRow label={d.buyers.investorType} value={d.investorTypes[buyer.investorType]} />
              <DataRow label={d.buyers.timeline} value={buyer.timeline || d.common.none} />
              <DataRow
                label={d.auth.country}
                value={
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 text-muted" />
                    {buyer.country}
                  </span>
                }
              />
              {revealIdentity ? <DataRow label={d.auth.name} value={buyer.user.name} /> : null}
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
