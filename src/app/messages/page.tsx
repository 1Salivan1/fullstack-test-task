import Link from "next/link";
import { Role } from "@prisma/client";
import { MessageSquare } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { listConversations } from "@/lib/queries/messages";
import { formatDateTime, initials } from "@/lib/format";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Messages — N5Deal" };

export default async function MessagesPage() {
  const { d, locale } = await getI18n();
  const user = await requireUser();

  // Managers have no deal correspondence of their own; send them where they can act.
  if (user.role === Role.MANAGER) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <EmptyState
          title={d.errors.forbidden}
          body={d.errors.forbiddenBody}
          action={<ButtonLink href="/admin">{d.nav.admin}</ButtonLink>}
        />
      </div>
    );
  }

  const conversations = await listConversations(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader title={d.messages.title} subtitle={d.messages.subtitle} />

      {conversations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<MessageSquare className="size-6" />}
            title={d.messages.empty}
            body={d.messages.emptyHint}
            action={
              <ButtonLink href={user.role === Role.BUYER ? "/assets" : "/buyers"} size="sm">
                {user.role === Role.BUYER ? d.nav.assets : d.nav.buyers}
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-surface-2"
              >
                <Avatar
                  initials={initials(
                    conversation.counterparty.company || conversation.counterparty.name || "?",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink">
                      {conversation.counterparty.company || conversation.counterparty.name}
                    </p>
                    {conversation.unread > 0 ? (
                      <Badge tone="accent">{d.messages.unreadBadge(conversation.unread)}</Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-accent">
                    {conversation.assetTitle
                      ? d.messages.about(conversation.assetTitle)
                      : d.messages.generalEnquiry}
                  </p>
                  {conversation.lastMessage ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">
                      {conversation.lastMessage.senderId === user.id ? `${d.common.you}: ` : ""}
                      {conversation.lastMessage.body}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11px] text-muted">
                  {formatDateTime(conversation.lastMessageAt, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
