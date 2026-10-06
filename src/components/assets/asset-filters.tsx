import Link from "next/link";
import { Search } from "lucide-react";
import type { AssetFilters, AssetSort } from "@/lib/filters/asset-filters";
import { countActiveAssetFilters } from "@/lib/filters/asset-filters";
import { DEAL_TYPES, JURISDICTIONS, LICENSE_TYPES, SECTORS } from "@/lib/taxonomy";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Button } from "@/components/ui/button";
import { CheckboxChips, Field, Input, Select } from "@/components/ui/form";
import { AutoSubmitSelect } from "@/components/ui/auto-submit";

const SORT_LABEL: Record<AssetSort, "newest" | "priceAsc" | "priceDesc" | "revenueDesc"> = {
  newest: "newest",
  priceAsc: "priceAsc",
  priceDesc: "priceDesc",
  revenueDesc: "revenueDesc",
};

export function AssetFilterPanel({
  filters,
  d,
  action = "/assets",
}: {
  filters: AssetFilters;
  d: Dictionary;
  action?: string;
}) {
  const active = countActiveAssetFilters(filters);

  return (
    <form
      method="get"
      action={action}
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          {d.common.filters}
          {active > 0 ? <span className="ml-2 text-xs text-accent">{active}</span> : null}
        </h2>
        {active > 0 ? (
          <Link href={action} className="text-xs text-muted underline hover:text-ink">
            {d.common.reset}
          </Link>
        ) : null}
      </div>

      <Field label={d.common.search} htmlFor="asset-q">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            id="asset-q"
            name="q"
            defaultValue={filters.q}
            placeholder={d.common.searchPlaceholder}
            className="pl-9"
          />
        </div>
      </Field>

      <Field label={d.common.sortBy}>
        <AutoSubmitSelect name="sort" defaultValue={filters.sort} className="w-full">
          {(Object.keys(SORT_LABEL) as AssetSort[]).map((sort) => (
            <option key={sort} value={sort}>
              {d.common[SORT_LABEL[sort]]}
            </option>
          ))}
        </AutoSubmitSelect>
      </Field>

      <Field label={d.assets.sector}>
        <CheckboxChips name="sector" options={SECTORS} selected={filters.sectors} />
      </Field>

      <Field label={d.assets.jurisdiction}>
        <CheckboxChips name="jurisdiction" options={JURISDICTIONS} selected={filters.jurisdictions} />
      </Field>

      <Field label={d.assets.license}>
        <Select name="license" defaultValue={filters.licenses[0] ?? ""}>
          <option value="">{d.common.any}</option>
          {LICENSE_TYPES.map((license) => (
            <option key={license} value={license}>
              {license}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={d.assets.dealType}>
        <CheckboxChips
          name="deal"
          options={DEAL_TYPES}
          selected={filters.dealTypes}
          labels={d.dealTypes}
        />
      </Field>

      <Field label={d.assets.priceRange} hint="EUR">
        <div className="flex items-center gap-2">
          <Input
            name="priceMin"
            inputMode="numeric"
            placeholder={d.common.min}
            defaultValue={filters.priceMin ?? ""}
            aria-label={`${d.assets.priceRange} — ${d.common.min}`}
          />
          <span className="text-muted">–</span>
          <Input
            name="priceMax"
            inputMode="numeric"
            placeholder={d.common.max}
            defaultValue={filters.priceMax ?? ""}
            aria-label={`${d.assets.priceRange} — ${d.common.max}`}
          />
        </div>
      </Field>

      <Button type="submit" className="w-full">
        {d.common.apply}
      </Button>
    </form>
  );
}
