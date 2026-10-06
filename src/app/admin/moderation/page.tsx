import Link from "next/link";
import { ModerationActionType } from "@prisma/client";
import { getI18n } from "@/i18n/server";
import { listModerationActions } from "@/lib/queries/admin";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui/display";

export const metadata = { title: "Moderation log — N5Deal" };

const TONE: Record<ModerationActionType, "accent" | "warning" | "danger"> = {
  REINSTATE: "accent",
  SUSPEND: "warning",
  REMOVE: "danger",
};

export default async function ModerationLogPage() {
  const { d, locale } = await getI18n();
  const actions = await listModerationActions(100);

  if (actions.length === 0) {
    return <EmptyState title={d.admin.moderationEmpty} />;
  }

  const label: Record<ModerationActionType, string> = {
    SUSPEND: d.admin.suspend,
    REINSTATE: d.admin.reinstate,
    REMOVE: d.admin.remove,
  };

  return (
    <Card>
      <ul className="flex flex-col gap-4">
        {actions.map((action) => (
          <li
            key={action.id}
            className="flex flex-col gap-1 border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TONE[action.action]}>{label[action.action]}</Badge>

              {action.targetUser ? (
                <span className="text-sm text-ink">
                  {d.admin.targetUser}:{" "}
                  <Link href={`/buyers/${action.targetUser.id}`} className="hover:underline">
                    {action.targetUser.name}
                  </Link>
                </span>
              ) : null}

              {action.targetAsset ? (
                <span className="text-sm text-ink">
                  {d.admin.targetAsset}:{" "}
                  <Link href={`/assets/${action.targetAsset.id}`} className="hover:underline">
                    {action.targetAsset.title}
                  </Link>
                </span>
              ) : null}

              {!action.targetUser && !action.targetAsset ? (
                <span className="text-sm text-muted">{d.common.none}</span>
              ) : null}

              <span className="ml-auto text-[11px] text-muted">
                {formatDateTime(action.createdAt, locale)} {d.admin.actionBy(action.manager.name)}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted">{action.reason}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
