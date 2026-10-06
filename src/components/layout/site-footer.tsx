import Link from "next/link";
import { getI18n } from "@/i18n/server";

export async function SiteFooter() {
  const { d } = await getI18n();

  return (
    <footer className="border-t border-border bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-semibold text-ink">{d.brand.name}</span> — {d.brand.tagline}
        </p>
        <p className="flex items-center gap-3">
          <Link href="/assets" className="hover:text-ink">
            {d.nav.assets}
          </Link>
          <Link href="/demo" className="hover:text-ink">
            {d.nav.demo}
          </Link>
          <span>Prototype · not investment advice</span>
        </p>
      </div>
    </footer>
  );
}
