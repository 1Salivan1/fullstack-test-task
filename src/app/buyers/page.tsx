import { Role } from "@prisma/client";
import { SearchX } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { listBuyers } from "@/lib/queries/buyers";
import { buyerFiltersToQuery, parseBuyerFilters } from "@/lib/filters/buyer-filters";
import { BuyerCard } from "@/components/buyers/buyer-card";
import { BuyerFilterPanel } from "@/components/buyers/buyer-filters";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Buyers — N5Deal" };

/**
 * The buyer catalogue is intentionally not public: mandates are commercially
 * sensitive, so only sellers (who have something to offer) and platform
 * managers can browse them.
 */
export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { d, locale } = await getI18n();
  const viewer = await requireRole(Role.SELLER, Role.MANAGER);
  const filters = parseBuyerFilters(await searchParams);

  const { items, total, page, pageCount } = await listBuyers(filters, {
    includeInactive: viewer.role === Role.MANAGER,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={d.buyers.title} subtitle={d.buyers.subtitle} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BuyerFilterPanel filters={filters} d={d} />
        </aside>

        <section className="flex flex-col gap-5">
          <p className="text-xs text-muted">{d.common.results(total)}</p>

          {items.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-6" />}
              title={d.buyers.emptyTitle}
              body={d.buyers.emptyBody}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((buyer) => (
                <BuyerCard key={buyer.id} buyer={buyer} d={d} locale={locale} />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            pageCount={pageCount}
            hrefFor={(target) => `/buyers${buyerFiltersToQuery({ ...filters, page: target })}`}
            labels={{ previous: d.common.previous, next: d.common.next, page: d.common.page }}
          />
        </section>
      </div>
    </div>
  );
}
