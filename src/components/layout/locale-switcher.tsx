"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { setLocaleAction } from "@/lib/actions/auth";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Switching locale keeps the visitor exactly where they are, filters included,
 * by posting the current path back with the choice.
 */
export function LocaleSwitcher() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const next = query ? `${pathname}?${query}` : pathname;

  return (
    <form action={setLocaleAction} className="flex items-center rounded-md border border-border p-0.5">
      <input type="hidden" name="next" value={next} />
      {LOCALES.map((option) => (
        <button
          key={option}
          type="submit"
          name="locale"
          value={option}
          aria-pressed={option === locale}
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium transition-colors",
            option === locale ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
          )}
        >
          {LOCALE_LABELS[option]}
        </button>
      ))}
    </form>
  );
}
