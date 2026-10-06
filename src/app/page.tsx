import { ArrowRight, Building2, ShieldCheck, Sparkles } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getFeaturedAssets, getMarketplaceStats } from "@/lib/queries/assets";
import { AssetCard } from "@/components/assets/asset-card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Stat } from "@/components/ui/display";

export default async function HomePage() {
  const { d, locale } = await getI18n();
  const [stats, featured] = await Promise.all([getMarketplaceStats(), getFeaturedAssets(3)]);

  const pillars = [
    { icon: Building2, title: d.landing.forSellers, body: d.landing.forSellersBody },
    { icon: Sparkles, title: d.landing.forBuyers, body: d.landing.forBuyersBody },
    { icon: ShieldCheck, title: d.landing.forManagers, body: d.landing.forManagersBody },
  ];

  return (
    <div>
      <section className="hero-grid border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Badge tone="accent">{d.landing.heroBadge}</Badge>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            {d.landing.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted">{d.landing.heroSubtitle}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/assets" size="lg">
              {d.landing.browseAssets}
              <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/demo" variant="secondary" size="lg">
              {d.landing.tryDemo}
            </ButtonLink>
          </div>

          <div className="mt-12 grid max-w-2xl gap-3 sm:grid-cols-3">
            <Stat label={d.landing.statsAssets} value={stats.assets} />
            <Stat label={d.landing.statsBuyers} value={stats.buyers} />
            <Stat label={d.landing.statsJurisdictions} value={stats.jurisdictions} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {d.landing.howItWorks}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="flex flex-col gap-2">
              <pillar.icon className="size-5 text-accent" />
              <h3 className="text-base font-semibold text-ink">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{pillar.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {d.landing.featured}
            </h2>
            <ButtonLink href="/assets" variant="ghost" size="sm">
              {d.landing.viewAll}
              <ArrowRight className="size-4" />
            </ButtonLink>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {featured.map((asset) => (
              <AssetCard key={asset.id} asset={asset} d={d} locale={locale} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
