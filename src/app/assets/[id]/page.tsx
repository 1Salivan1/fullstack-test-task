import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetStatus, Role, UserStatus } from "@prisma/client";
import { Building2, Globe, MapPin, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAssetForViewer } from "@/lib/queries/assets";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { Badge, Card, DataRow, PageHeader } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { ContactPanel } from "@/components/messages/contact-panel";
import { ModerationForm } from "@/components/admin/moderation-form";

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d, locale } = await getI18n();
  const viewer = await getCurrentUser();
  const asset = await getAssetForViewer(id, viewer);

  if (!asset) notFound();

  const company = asset.seller.sellerProfile?.companyName ?? asset.seller.name;
  const price = formatMoney(asset.askingPrice, asset.currency, locale);
  const canContact =
    viewer?.role === Role.BUYER &&
    asset.publiclyVisible &&
    asset.seller.status === UserStatus.ACTIVE;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/assets" className="text-xs text-muted hover:text-ink">
        ← {d.assets.title}
      </Link>

      {asset.status === AssetStatus.SUSPENDED ? (
        <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {d.assets.suspendedNotice}
        </p>
      ) : null}
      {asset.status === AssetStatus.DRAFT ? (
        <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {d.assets.draftNotice}
        </p>
      ) : null}

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">{asset.sector}</Badge>
          {asset.licenseType ? <Badge>{asset.licenseType}</Badge> : null}
          <Badge>{d.dealTypes[asset.dealType]}</Badge>
          {asset.publishedAt ? (
            <span className="text-xs text-muted">
              {d.assets.listedOn(formatDate(asset.publishedAt, locale))}
            </span>
          ) : null}
        </div>

        <PageHeader
          title={asset.title}
          subtitle={asset.summary}
          actions={
            <>
              {asset.isOwner ? (
                <ButtonLink href={`/seller/assets/${asset.id}/edit`} variant="secondary" size="sm">
                  <PenLine className="size-4" />
                  {d.common.edit}
                </ButtonLink>
              ) : null}
              {asset.isOwner ? (
                <ButtonLink href={`/seller/assets/${asset.id}/matches`} size="sm">
                  <Sparkles className="size-4" />
                  {d.assets.matchesCta}
                </ButtonLink>
              ) : null}
            </>
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="text-sm font-semibold text-ink">{d.assets.about}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
              {asset.description || d.common.none}
            </p>
          </Card>

          {asset.highlights.length > 0 ? (
            <Card>
              <h2 className="text-sm font-semibold text-ink">{d.assets.highlights}</h2>
              <ul className="mt-2 flex flex-col gap-1.5">
                {asset.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2 text-sm text-muted">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {canContact ? (
            <Card>
              <ContactPanel
                counterpartyId={asset.sellerId}
                counterpartyName={asset.seller.name}
                assetId={asset.id}
                direction="buyerToSeller"
              />
            </Card>
          ) : null}

          {viewer === null ? (
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">{d.auth.demoSubtitle}</p>
              <ButtonLink href={`/login?next=/assets/${asset.id}`} size="sm">
                {d.assets.contactSeller}
              </ButtonLink>
            </Card>
          ) : null}

          {asset.viewerIsManager ? (
            <Card>
              <h2 className="mb-2 text-sm font-semibold text-ink">{d.admin.moderate}</h2>
              <ModerationForm
                targetAssetId={asset.id}
                canReinstate={asset.status === AssetStatus.SUSPENDED}
              />
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <dl>
              <DataRow label={d.assets.askingPrice} value={price ?? d.common.priceOnRequest} />
              <DataRow
                label={d.assets.revenue}
                value={formatMoney(asset.revenue, asset.currency, locale) ?? d.common.none}
              />
              <DataRow
                label={d.assets.ebitda}
                value={formatMoney(asset.ebitda, asset.currency, locale) ?? d.common.none}
              />
              <DataRow label={d.assets.employees} value={formatNumber(asset.employees, locale)} />
              <DataRow
                label={d.assets.founded}
                value={asset.foundedYear ? String(asset.foundedYear) : d.common.none}
              />
              <DataRow label={d.assets.jurisdiction} value={asset.jurisdiction} />
              <DataRow label={d.assets.license} value={asset.licenseType || d.common.none} />
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink">{d.assets.seller}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-ink">
              <Building2 className="size-4 text-muted" />
              {company}
              {asset.seller.sellerProfile?.verified ? (
                <ShieldCheck className="size-4 text-accent" aria-label={d.common.verified} />
              ) : null}
            </p>
            {asset.seller.sellerProfile?.country ? (
              <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                <MapPin className="size-3.5" />
                {asset.seller.sellerProfile.country}
              </p>
            ) : null}
            {asset.seller.sellerProfile?.website ? (
              <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                <Globe className="size-3.5" />
                {asset.seller.sellerProfile.website.replace(/^https?:\/\//, "")}
              </p>
            ) : null}
            {asset.seller.sellerProfile?.about ? (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {asset.seller.sellerProfile.about}
              </p>
            ) : null}
            {asset.seller.status !== UserStatus.ACTIVE ? (
              <Badge tone="danger" className="mt-2">
                {d.userStatus[asset.seller.status]}
              </Badge>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
