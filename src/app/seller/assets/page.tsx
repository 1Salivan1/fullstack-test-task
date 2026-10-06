import Link from "next/link";
import { AssetStatus, Role } from "@prisma/client";
import { Archive, Eye, PenLine, Plus, Send, Sparkles, Upload } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { listAssets } from "@/lib/queries/assets";
import { assetFiltersToQuery, parseAssetFilters } from "@/lib/filters/asset-filters";
import { setAssetStatusAction } from "@/lib/actions/assets";
import { AssetCard } from "@/components/assets/asset-card";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "My listings — N5Deal" };

export default async function SellerAssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { d, locale } = await getI18n();
  const user = await requireRole(Role.SELLER);
  const filters = parseAssetFilters(await searchParams);

  const { items, total, page, pageCount } = await listAssets(filters, {
    kind: "seller",
    sellerId: user.id,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title={d.assets.myListings}
        subtitle={d.assets.myListingsSubtitle}
        actions={
          <ButtonLink href="/seller/assets/new">
            <Plus className="size-4" />
            {d.assets.newListing}
          </ButtonLink>
        }
      />

      <p className="mt-4 text-xs text-muted">{d.common.results(total)}</p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={d.assets.noListings}
            body={d.dashboard.createFirstListingBody}
            action={
              <ButtonLink href="/seller/assets/new" size="sm">
                <Plus className="size-4" />
                {d.assets.newListing}
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              d={d}
              locale={locale}
              footer={
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/seller/assets/${asset.id}/edit`}
                    className={buttonClass("ghost", "sm")}
                  >
                    <PenLine className="size-3.5" />
                    {d.common.edit}
                  </Link>
                  <Link href={`/assets/${asset.id}`} className={buttonClass("ghost", "sm")}>
                    <Eye className="size-3.5" />
                    {d.assets.viewListing}
                  </Link>
                  <Link
                    href={`/seller/assets/${asset.id}/matches`}
                    className={buttonClass("ghost", "sm")}
                  >
                    <Sparkles className="size-3.5" />
                    {d.nav.matches}
                  </Link>

                  {asset.status === AssetStatus.DRAFT ? (
                    <form action={setAssetStatusAction} className="ml-auto">
                      <input type="hidden" name="assetId" value={asset.id} />
                      <input type="hidden" name="status" value={AssetStatus.PUBLISHED} />
                      <button type="submit" className={buttonClass("primary", "sm")}>
                        <Upload className="size-3.5" />
                        {d.assets.publish}
                      </button>
                    </form>
                  ) : null}

                  {asset.status === AssetStatus.PUBLISHED ? (
                    <>
                      <form action={setAssetStatusAction} className="ml-auto">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <input type="hidden" name="status" value={AssetStatus.DRAFT} />
                        <button type="submit" className={buttonClass("ghost", "sm")}>
                          <Send className="size-3.5" />
                          {d.assets.unpublish}
                        </button>
                      </form>
                      <form action={setAssetStatusAction}>
                        <input type="hidden" name="assetId" value={asset.id} />
                        <input type="hidden" name="status" value={AssetStatus.ARCHIVED} />
                        <button type="submit" className={buttonClass("ghost", "sm")}>
                          <Archive className="size-3.5" />
                          {d.assets.archive}
                        </button>
                      </form>
                    </>
                  ) : null}
                </div>
              }
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        <Pagination
          page={page}
          pageCount={pageCount}
          hrefFor={(target) => `/seller/assets${assetFiltersToQuery({ ...filters, page: target })}`}
          labels={{ previous: d.common.previous, next: d.common.next, page: d.common.page }}
        />
      </div>
    </div>
  );
}
