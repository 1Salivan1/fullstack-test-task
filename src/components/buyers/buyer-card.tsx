import Link from "next/link";
import { UserStatus, Visibility } from "@prisma/client";
import { EyeOff, MapPin, ShieldCheck } from "lucide-react";
import type { BuyerListItem } from "@/lib/queries/buyers";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { formatRange } from "@/lib/format";
import { Badge } from "@/components/ui/display";

export function BuyerCard({
  buyer,
  d,
  locale,
  footer,
}: {
  buyer: BuyerListItem;
  d: Dictionary;
  locale: Locale;
  footer?: React.ReactNode;
}) {
  const anonymous = buyer.visibility === Visibility.ANONYMOUS;
  const name = anonymous ? d.buyers.anonymous : buyer.companyName;

  return (
    <article className="group flex h-full flex-col rounded-xl border border-border bg-surface transition-colors hover:border-border-strong">
      <Link href={`/buyers/${buyer.userId}`} className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
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

        <h3 className="text-base font-semibold text-ink group-hover:text-accent">{name}</h3>
        <p className="line-clamp-3 text-sm text-muted">{buyer.thesis || d.buyers.noMandateBody}</p>

        <dl className="mt-auto flex flex-col gap-2 border-t border-border pt-3 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-[11px] uppercase tracking-wide text-muted">{d.buyers.ticket}</dt>
            <dd className="font-semibold text-ink">
              {formatRange(buyer.ticketMin, buyer.ticketMax, buyer.currency, locale)}
            </dd>
          </div>
          {buyer.sectors.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {buyer.sectors.slice(0, 3).map((sector) => (
                <Badge key={sector}>{sector}</Badge>
              ))}
              {buyer.sectors.length > 3 ? <Badge>+{buyer.sectors.length - 3}</Badge> : null}
            </div>
          ) : null}
        </dl>

        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {buyer.country}
          </span>
          {buyer.timeline ? <span className="ml-auto">{buyer.timeline}</span> : null}
        </div>
      </Link>
      {footer ? <div className="border-t border-border px-5 py-3">{footer}</div> : null}
    </article>
  );
}
