import Link from "next/link";
import { AssetStatus } from "@prisma/client";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import type { AssetListItem } from "@/lib/queries/assets";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { formatMoneyCompact } from "@/lib/format";
import { Badge } from "@/components/ui/display";

export function AssetCard({
  asset,
  d,
  locale,
  footer,
}: {
  asset: AssetListItem;
  d: Dictionary;
  locale: Locale;
  footer?: React.ReactNode;
}) {
  const price = formatMoneyCompact(asset.askingPrice, asset.currency, locale);
  const revenue = formatMoneyCompact(asset.revenue, asset.currency, locale);
  const company = asset.seller.sellerProfile?.companyName ?? asset.seller.name;

  return (
    <article className="group flex h-full flex-col rounded-xl border border-border bg-surface transition-colors hover:border-border-strong">
      <Link href={`/assets/${asset.id}`} className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">{asset.sector}</Badge>
          {asset.licenseType ? <Badge>{asset.licenseType}</Badge> : null}
          {asset.status !== AssetStatus.PUBLISHED ? (
            <Badge tone={asset.status === AssetStatus.SUSPENDED ? "danger" : "warning"}>
              {d.assetStatus[asset.status]}
            </Badge>
          ) : null}
        </div>

        <h3 className="text-base font-semibold leading-snug text-ink group-hover:text-accent">
          {asset.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted">{asset.summary}</p>

        <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">{d.assets.askingPrice}</dt>
            <dd className="font-semibold text-ink">{price ?? d.common.priceOnRequest}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">{d.assets.revenue}</dt>
            <dd className="font-semibold text-ink">{revenue ?? d.common.none}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {asset.jurisdiction}
          </span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="size-3.5" /> {company}
          </span>
          {asset.seller.sellerProfile?.verified ? (
            <span className="inline-flex items-center gap-1 text-accent">
              <ShieldCheck className="size-3.5" /> {d.common.verified}
            </span>
          ) : null}
          <span className="ml-auto">{d.dealTypes[asset.dealType]}</span>
        </div>
      </Link>
      {footer ? <div className="border-t border-border px-5 py-3">{footer}</div> : null}
    </article>
  );
}
