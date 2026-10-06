import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { getAdminOverview, listModerationActions } from "@/lib/queries/admin";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, Stat } from "@/components/ui/display";

export const metadata = { title: "Administration — N5Deal" };

export default async function AdminOverviewPage() {
  const { d, locale } = await getI18n();
  const [overview, actions] = await Promise.all([getAdminOverview(), listModerationActions(5)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label={d.admin.totalBuyers} value={overview.buyers} />
        <Stat label={d.admin.totalSellers} value={overview.sellers} />
        <Stat label={d.admin.totalAssets} value={overview.assets} />
        <Stat label={d.admin.publishedAssets} value={overview.published} />
        <Stat label={d.admin.suspendedUsers} value={overview.suspendedUsers} />
        <Stat label={d.admin.conversations} value={overview.conversations} />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{d.admin.moderationLog}</h2>
          <Link href="/admin/moderation" className="text-xs text-accent hover:underline">
            {d.common.all}
          </Link>
        </div>

        {actions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{d.admin.moderationEmpty}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {actions.map((action) => (
              <li key={action.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      action.action === "REINSTATE"
                        ? "accent"
                        : action.action === "REMOVE"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {d.admin[
                      action.action === "REINSTATE"
                        ? "reinstate"
                        : action.action === "REMOVE"
                          ? "remove"
                          : "suspend"
                    ]}
                  </Badge>
                  <span className="text-sm text-ink">
                    {action.targetUser
                      ? `${d.admin.targetUser}: ${action.targetUser.name}`
                      : action.targetAsset
                        ? `${d.admin.targetAsset}: ${action.targetAsset.title}`
                        : "—"}
                  </span>
                  <span className="ml-auto text-[11px] text-muted">
                    {formatDateTime(action.createdAt, locale)} {d.admin.actionBy(action.manager.name)}
                  </span>
                </div>
                <p className="text-xs text-muted">{action.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
