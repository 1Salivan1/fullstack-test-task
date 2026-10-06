import Link from "next/link";
import { Role } from "@prisma/client";
import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import { countUnread } from "@/lib/queries/messages";
import { logoutAction } from "@/lib/actions/auth";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/display";
import { LocaleSwitcher } from "./locale-switcher";
import { NavLink } from "./nav-link";

export async function SiteHeader() {
  const { d } = await getI18n();
  const user = await getCurrentUser();
  const unread = user && user.role !== Role.MANAGER ? await countUnread(user.id) : 0;

  const links: Array<{ href: string; label: string; badge?: number }> = [
    { href: "/assets", label: d.nav.assets },
  ];

  if (user?.role === Role.SELLER) {
    links.push(
      { href: "/seller/assets", label: d.nav.myListings },
      { href: "/buyers", label: d.nav.buyers },
      { href: "/messages", label: d.nav.messages, badge: unread },
    );
  }
  if (user?.role === Role.BUYER) {
    links.push(
      { href: "/buyer/matches", label: d.nav.matches },
      { href: "/buyer/profile", label: d.nav.mandate },
      { href: "/messages", label: d.nav.messages, badge: unread },
    );
  }
  if (user?.role === Role.MANAGER) {
    links.push({ href: "/buyers", label: d.nav.buyers }, { href: "/admin", label: d.nav.admin });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-ink">
            N5
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            {d.brand.name}
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href}>
              <span className="flex items-center gap-1.5">
                {link.label}
                {link.badge ? (
                  <Badge tone="accent" className="px-1.5">
                    {link.badge}
                  </Badge>
                ) : null}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-ink sm:flex"
              >
                <span className="max-w-32 truncate">{user.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-accent">
                  {d.roles[user.role]}
                </span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className={buttonClass("ghost", "sm")}
                  aria-label={d.nav.logout}
                  title={d.nav.logout}
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                {d.nav.login}
              </ButtonLink>
              <ButtonLink href="/demo" variant="primary" size="sm">
                {d.nav.demo}
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
