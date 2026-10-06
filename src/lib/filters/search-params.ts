/**
 * Filters live in the URL, so every list view is shareable, survives a refresh
 * and works with the browser's back button without any client-side store.
 * Next.js hands us `searchParams` as this loose record shape.
 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

export function readString(params: RawSearchParams, key: string): string {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return (first ?? "").trim();
}

/** Accepts both `?sector=A&sector=B` and `?sector=A,B`. */
export function readList(params: RawSearchParams, key: string): string[] {
  const value = params[key];
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readInt(params: RawSearchParams, key: string): number | null {
  const raw = readString(params, key).replace(/[\s_]/g, "");
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function readPage(params: RawSearchParams, key = "page"): number {
  const parsed = readInt(params, key);
  return parsed && parsed > 0 ? parsed : 1;
}

export function toSearchString(entries: Record<string, string | string[] | number | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value === null || value === "" || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) if (item) sp.append(key, item);
    } else {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
