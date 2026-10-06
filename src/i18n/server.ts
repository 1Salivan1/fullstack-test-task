import { cookies } from "next/headers";
import { en, type Dictionary } from "./dictionaries/en";
import { uk } from "./dictionaries/uk";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";

const DICTIONARIES: Record<Locale, Dictionary> = { en, uk };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/**
 * Locale lives in a cookie rather than in the URL: filters already own the
 * query string, and keeping one canonical URL per listing means a shared link
 * opens in the reader's own language instead of the sender's.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getI18n(): Promise<{ locale: Locale; d: Dictionary }> {
  const locale = await getLocale();
  return { locale, d: getDictionary(locale) };
}
