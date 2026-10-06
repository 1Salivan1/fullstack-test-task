import Link from "next/link";
import { Search } from "lucide-react";
import type { BuyerFilters, BuyerSort } from "@/lib/filters/buyer-filters";
import { countActiveBuyerFilters } from "@/lib/filters/buyer-filters";
import { DEAL_TYPES, INVESTOR_TYPES, JURISDICTIONS, SECTORS } from "@/lib/taxonomy";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Button } from "@/components/ui/button";
import { CheckboxChips, Field, Input, Select } from "@/components/ui/form";
import { AutoSubmitSelect } from "@/components/ui/auto-submit";

const SORT_OPTIONS: Array<{ value: BuyerSort; label: (d: Dictionary) => string }> = [
  { value: "newest", label: (d) => d.common.newest },
  { value: "ticketDesc", label: (d) => `${d.buyers.ticket} ↓` },
  { value: "ticketAsc", label: (d) => `${d.buyers.ticket} ↑` },
];

export function BuyerFilterPanel({ filters, d }: { filters: BuyerFilters; d: Dictionary }) {
  const active = countActiveBuyerFilters(filters);

  return (
    <form
      method="get"
      action="/buyers"
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          {d.common.filters}
          {active > 0 ? <span className="ml-2 text-xs text-accent">{active}</span> : null}
        </h2>
        {active > 0 ? (
          <Link href="/buyers" className="text-xs text-muted underline hover:text-ink">
            {d.common.reset}
          </Link>
        ) : null}
      </div>

      <Field label={d.common.search} htmlFor="buyer-q">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            id="buyer-q"
            name="q"
            defaultValue={filters.q}
            placeholder={d.common.searchPlaceholder}
            className="pl-9"
          />
        </div>
      </Field>

      <Field label={d.common.sortBy}>
        <AutoSubmitSelect name="sort" defaultValue={filters.sort} className="w-full">
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label(d)}
            </option>
          ))}
        </AutoSubmitSelect>
      </Field>

      <Field label={d.buyers.investorType}>
        <Select name="investor" defaultValue={filters.investorTypes[0] ?? ""}>
          <option value="">{d.common.any}</option>
          {INVESTOR_TYPES.map((type) => (
            <option key={type} value={type}>
              {d.investorTypes[type]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={d.buyers.sectors}>
        <CheckboxChips name="sector" options={SECTORS} selected={filters.sectors} />
      </Field>

      <Field label={d.buyers.geographies}>
        <CheckboxChips name="geography" options={JURISDICTIONS} selected={filters.geographies} />
      </Field>

      <Field label={d.buyers.dealTypes}>
        <CheckboxChips
          name="deal"
          options={DEAL_TYPES}
          selected={filters.dealTypes}
          labels={d.dealTypes}
        />
      </Field>

      <Field label={d.buyers.ticket} hint="EUR">
        <div className="flex items-center gap-2">
          <Input
            name="ticketMin"
            inputMode="numeric"
            placeholder={d.common.min}
            defaultValue={filters.ticketMin ?? ""}
            aria-label={`${d.buyers.ticket} — ${d.common.min}`}
          />
          <span className="text-muted">–</span>
          <Input
            name="ticketMax"
            inputMode="numeric"
            placeholder={d.common.max}
            defaultValue={filters.ticketMax ?? ""}
            aria-label={`${d.buyers.ticket} — ${d.common.max}`}
          />
        </div>
      </Field>

      <Button type="submit" className="w-full">
        {d.common.apply}
      </Button>
    </form>
  );
}
