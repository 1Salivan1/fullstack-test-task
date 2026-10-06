import { AssetStatus } from "@prisma/client";
import { getI18n } from "@/i18n/server";
import { listAssets } from "@/lib/queries/assets";
import { assetFiltersToQuery, parseAssetFilters } from "@/lib/filters/asset-filters";
import { readString } from "@/lib/filters/search-params";
import { AssetCard } from "@/components/assets/asset-card";
import { AssetFilterPanel } from "@/components/assets/asset-filters";
import { EmptyState } from "@/components/ui/display";
import { Pagination } from "@/components/ui/pagination";
import { ModerationForm } from "@/components/admin/moderation-form";

export const metadata = { title: "Listings — N5Deal" };

export default async function AdminAssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { d, locale } = await getI18n();
  const params = await searchParams;
  const filters = parseAssetFilters(params);

  // Managers see every listing by default, and can narrow to one status.
  const statusParam = readString(params, "status");
  const statuses = Object.values(AssetStatus).includes(statusParam as AssetStatus)
    ? [statusParam as AssetStatus]
    : undefined;

  const { items, total, page, pageCount } = await listAssets(filters, { kind: "manager", statuses });

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <AssetFilterPanel filters={filters} d={d} action="/admin/assets" />
      </aside>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/admin/assets"
            className={`rounded-md border px-3 py-1.5 text-xs ${
              statuses ? "border-border text-muted" : "border-accent/50 bg-accent-soft text-accent"
            }`}
          >
            {d.common.all}
          </a>
          {Object.values(AssetStatus).map((status) => (
            <a
              key={status}
              href={`/admin/assets?status=${status}`}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                statuses?.[0] === status
                  ? "border-accent/50 bg-accent-soft text-accent"
                  : "border-border text-muted"
              }`}
            >
              {d.assetStatus[status]}
            </a>
          ))}
          <span className="ml-auto text-xs text-muted">{d.common.results(total)}</span>
        </div>

        {items.length === 0 ? (
          <EmptyState title={d.assets.emptyTitle} body={d.assets.emptyBody} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {items.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                d={d}
                locale={locale}
                footer={
                  <ModerationForm
                    targetAssetId={asset.id}
                    canReinstate={asset.status === AssetStatus.SUSPENDED}
                    compact
                  />
                }
              />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          pageCount={pageCount}
          hrefFor={(target) => {
            const query = assetFiltersToQuery({ ...filters, page: target });
            if (!statuses) return `/admin/assets${query}`;
            return `/admin/assets${query}${query ? "&" : "?"}status=${statuses[0]}`;
          }}
          labels={{ previous: d.common.previous, next: d.common.next, page: d.common.page }}
        />
      </section>
    </div>
  );
}
