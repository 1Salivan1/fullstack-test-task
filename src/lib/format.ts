import type { Locale } from "@/i18n/config";

const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", uk: "uk-UA" };

/** Compact money for cards and tables: "€2.4M", "$850K". */
export function formatMoneyCompact(
  amount: number | null | undefined,
  currency: string,
  locale: Locale = "en",
): string | null {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/** Exact money for detail pages: "€2,400,000". */
export function formatMoney(
  amount: number | null | undefined,
  currency: string,
  locale: Locale = "en",
): string | null {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string,
  locale: Locale = "en",
): string {
  const lo = formatMoneyCompact(min, currency, locale);
  const hi = formatMoneyCompact(max, currency, locale);
  if (lo && hi) return `${lo} – ${hi}`;
  if (lo) return `${lo}+`;
  if (hi) return `< ${hi}`;
  return "—";
}

export function formatNumber(value: number | null | undefined, locale: Locale = "en"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

export function formatDate(date: Date | string, locale: Locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string, locale: Locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
