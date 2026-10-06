import Link from "next/link";
import { notFound } from "next/navigation";
import { UserStatus } from "@prisma/client";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { getConversationForUser } from "@/lib/queries/messages";
import { formatDateTime, initials } from "@/lib/format";
import { Avatar, Badge, Card } from "@/components/ui/display";
import { MarkThreadRead, ThreadComposer } from "@/components/messages/thread-composer";
import { cn } from "@/lib/utils";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d, locale } = await getI18n();
  const user = await requireUser();

  const conversation = await getConversationForUser(id, user.id);
  if (!conversation) notFound();

  const counterpartyName =
    conversation.counterparty.company || conversation.counterparty.name || "—";
  const counterpartyActive = conversation.counterparty.status === UserStatus.ACTIVE;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <MarkThreadRead conversationId={conversation.id} />

      <Link href="/messages" className="text-xs text-muted hover:text-ink">
        ← {d.messages.title}
      </Link>

      <header className="mt-4 flex flex-wrap items-center gap-3">
        <Avatar initials={initials(counterpartyName)} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-ink">{counterpartyName}</h1>
          {conversation.asset ? (
            <Link
              href={`/assets/${conversation.asset.id}`}
              className="truncate text-xs text-accent hover:underline"
            >
              {d.messages.about(conversation.asset.title)}
            </Link>
          ) : (
            <p className="text-xs text-muted">{d.messages.generalEnquiry}</p>
          )}
        </div>
        {!counterpartyActive ? (
          <Badge tone="danger" className="ml-auto">
            {d.userStatus[conversation.counterparty.status]}
          </Badge>
        ) : null}
      </header>

      <div className="mt-6 flex flex-col gap-3">
        {conversation.messages.map((message) => {
          const own = message.senderId === user.id;
          return (
            <div
              key={message.id}
              className={cn("flex flex-col gap-1", own ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-line rounded-xl border px-4 py-3 text-sm leading-relaxed",
                  own
                    ? "border-accent/30 bg-accent-soft/60 text-ink"
                    : "border-border bg-surface text-ink",
                )}
              >
                {message.body}
              </div>
              <span className="text-[11px] text-muted">
                {own ? d.common.you : counterpartyName} · {formatDateTime(message.createdAt, locale)}
              </span>
            </div>
          );
        })}
      </div>

      <Card className="mt-6">
        <ThreadComposer
          conversationId={conversation.id}
          disabled={!counterpartyActive}
          disabledReason={d.messages.counterpartySuspended}
        />
      </Card>
    </div>
  );
}
