import Link from "next/link";
import { Role, UserStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { listParticipants, parseParticipantFilters } from "@/lib/queries/admin";
import { toSearchString } from "@/lib/filters/search-params";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/pagination";
import { ModerationForm } from "@/components/admin/moderation-form";

export const metadata = { title: "Participants — N5Deal" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { d, locale } = await getI18n();
  const filters = parseParticipantFilters(await searchParams);
  const { items, total, page, pageCount } = await listParticipants(filters);

  const query = (target: number) =>
    `/admin/users${toSearchString({
      q: filters.q,
      role: filters.roles,
      status: filters.statuses,
      page: target > 1 ? target : null,
    })}`;

  return (
    <div className="flex flex-col gap-4">
      <form method="get" action="/admin/users" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <Field label={d.common.search}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input name="q" defaultValue={filters.q} placeholder={d.common.searchPlaceholder} className="pl-9" />
          </div>
        </Field>
        <Field label={d.admin.role}>
          <Select name="role" defaultValue={filters.roles[0] ?? ""}>
            <option value="">{d.common.all}</option>
            {Object.values(Role).map((role) => (
              <option key={role} value={role}>
                {d.roles[role]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={d.admin.status}>
          <Select name="status" defaultValue={filters.statuses[0] ?? ""}>
            <option value="">{d.common.all}</option>
            {Object.values(UserStatus).map((status) => (
              <option key={status} value={status}>
                {d.userStatus[status]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit">{d.common.apply}</Button>
        </div>
      </form>

      <p className="text-xs text-muted">{d.common.results(total)}</p>

      {items.length === 0 ? (
        <EmptyState title={d.buyers.emptyTitle} body={d.buyers.emptyBody} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((participant) => {
            const company =
              participant.buyerProfile?.companyName ?? participant.sellerProfile?.companyName ?? "";
            return (
              <Card key={participant.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-ink">{participant.name}</h2>
                      <Badge>{d.roles[participant.role]}</Badge>
                      <Badge
                        tone={
                          participant.status === UserStatus.ACTIVE
                            ? "accent"
                            : participant.status === UserStatus.SUSPENDED
                              ? "warning"
                              : "danger"
                        }
                      >
                        {d.userStatus[participant.status]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {company ? `${company} · ` : ""}
                      {participant.email}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {d.admin.joined}: {formatDate(participant.createdAt, locale)}
                      {participant.role === Role.SELLER
                        ? ` · ${participant._count.assets} ${d.dashboard.listings.toLowerCase()}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {participant.role === Role.BUYER ? (
                      <Link
                        href={`/buyers/${participant.id}`}
                        className="text-xs text-accent hover:underline"
                      >
                        {d.buyers.viewProfile}
                      </Link>
                    ) : null}
                    {participant.role === Role.SELLER ? (
                      <Link
                        href={`/admin/assets?q=${encodeURIComponent(company || participant.name)}`}
                        className="text-xs text-accent hover:underline"
                      >
                        {d.admin.assetsTab}
                      </Link>
                    ) : null}
                  </div>
                </div>

                {participant.role === Role.MANAGER ? null : (
                  <ModerationForm
                    targetUserId={participant.id}
                    canReinstate={participant.status !== UserStatus.ACTIVE}
                    compact
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        hrefFor={query}
        labels={{ previous: d.common.previous, next: d.common.next, page: d.common.page }}
      />
    </div>
  );
}
