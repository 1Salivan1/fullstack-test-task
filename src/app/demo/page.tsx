import { Role, UserStatus } from "@prisma/client";
import { LogIn } from "lucide-react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getI18n } from "@/i18n/server";
import { demoLoginAction } from "@/lib/actions/auth";
import { Badge, Card, PageHeader } from "@/components/ui/display";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Demo access — N5Deal" };

const ROLE_ORDER: Role[] = [Role.BUYER, Role.SELLER, Role.MANAGER];

export default async function DemoPage() {
  const { d } = await getI18n();

  const users = await db.user.findMany({
    where: { email: { endsWith: "@n5deal.demo" } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      buyerProfile: { select: { companyName: true, investorType: true } },
      sellerProfile: { select: { companyName: true } },
      _count: { select: { assets: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader title={d.auth.demoTitle} subtitle={d.auth.demoSubtitle} />
      <p className="mt-3 text-xs text-muted">{d.auth.demoPasswordHint(env().DEMO_PASSWORD)}</p>

      {ROLE_ORDER.map((role) => {
        const group = users.filter((user) => user.role === role);
        if (group.length === 0) return null;

        return (
          <section key={role} className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {d.roles[role]}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((user) => {
                const company =
                  user.buyerProfile?.companyName ?? user.sellerProfile?.companyName ?? "";
                const blocked = user.status !== UserStatus.ACTIVE;

                return (
                  <Card key={user.id} className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{user.name}</p>
                        {company ? <p className="text-xs text-muted">{company}</p> : null}
                      </div>
                      {blocked ? (
                        <Badge tone="danger">{d.userStatus[user.status]}</Badge>
                      ) : user.role === Role.SELLER ? (
                        <Badge>{`${user._count.assets} ${d.dashboard.listings.toLowerCase()}`}</Badge>
                      ) : user.buyerProfile ? (
                        <Badge>{d.investorTypes[user.buyerProfile.investorType]}</Badge>
                      ) : null}
                    </div>

                    <p className="truncate font-mono text-[11px] text-muted">{user.email}</p>

                    <form action={demoLoginAction} className="mt-auto">
                      <input type="hidden" name="email" value={user.email} />
                      <button
                        type="submit"
                        disabled={blocked}
                        className={buttonClass(blocked ? "ghost" : "primary", "sm", "w-full")}
                      >
                        <LogIn className="size-4" />
                        {d.auth.demoLoginAs} {d.roles[user.role]}
                      </button>
                    </form>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="mt-8 rounded-md border border-border bg-surface px-4 py-3 text-xs text-muted">
        {d.auth.demoNote}
      </p>
    </div>
  );
}
