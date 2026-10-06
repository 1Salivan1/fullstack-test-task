import { SearchX } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listAssets } from "@/lib/queries/assets";
import { assetFiltersToQuery, parseAssetFilters } from "@/lib/filters/asset-filters";
import { AssetCard } from "@/components/assets/asset-card";
import { AssetFilterPanel } from "@/components/assets/asset-filters";
import { SmartSearch } from "@/components/ai/smart-search";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Assets — N5Deal" };

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { d, locale } = await getI18n();
  const params = await searchParams;
  const filters = parseAssetFilters(params);
  const viewer = await getCurrentUser();

  const { items, total, page, pageCount } = await listAssets(filters, { kind: "public" });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={d.assets.title} subtitle={d.assets.subtitle} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <AssetFilterPanel filters={filters} d={d} />
        </aside>

        <section className="flex flex-col gap-5">
          <SmartSearch />

          <p className="text-xs text-muted">{d.common.results(total)}</p>

          {items.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-6" />}
              title={d.assets.emptyTitle}
              body={d.assets.emptyBody}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((asset) => (
                <AssetCard key={asset.id} asset={asset} d={d} locale={locale} />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            pageCount={pageCount}
            hrefFor={(target) => `/assets${assetFiltersToQuery({ ...filters, page: target })}`}
            labels={{ previous: d.common.previous, next: d.common.next, page: d.common.page }}
          />

          {viewer === null ? (
            <p className="text-xs text-muted">
              {d.auth.demoSubtitle}{" "}
              <a href="/demo" className="text-accent underline">
                {d.nav.demo}
              </a>
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
