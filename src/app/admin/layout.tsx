import { Role } from "@prisma/client";
import { getI18n } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/display";
import { NavLink } from "@/components/layout/nav-link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { d } = await getI18n();
  await requireRole(Role.MANAGER);

  const tabs = [
    { href: "/admin", label: d.admin.overview, exact: true },
    { href: "/admin/users", label: d.admin.users },
    { href: "/admin/assets", label: d.admin.assetsTab },
    { href: "/admin/moderation", label: d.admin.moderationLog },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={d.admin.title} subtitle={d.admin.subtitle} />
      <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-border pb-2">
        {tabs.map((tab) => (
          <NavLink key={tab.href} href={tab.href} exact={"exact" in tab}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
