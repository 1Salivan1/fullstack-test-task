"use client";

import { createContext, useContext, type ReactNode } from "react";
import { en, type Dictionary } from "./dictionaries/en";
import { uk } from "./dictionaries/uk";
import type { Locale } from "./config";

const DICTIONARIES: Record<Locale, Dictionary> = { en, uk };

const LocaleContext = createContext<Locale>("en");

/**
 * Only the locale crosses the server/client boundary — dictionaries contain
 * interpolation functions, which are not serialisable as RSC props, so client
 * components resolve the dictionary from their own bundle.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n(): { locale: Locale; d: Dictionary } {
  const locale = useContext(LocaleContext);
  return { locale, d: DICTIONARIES[locale] };
}
