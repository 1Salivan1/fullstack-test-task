"use client";

import { useActionState, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { ModerationActionType } from "@prisma/client";
import { useI18n } from "@/i18n/client";
import { moderateAction } from "@/lib/actions/moderation";
import { EMPTY_ACTION_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/form";

/**
 * A moderation decision always captures a reason: the audit log is the point of
 * the feature, so the UI makes the reason mandatory rather than optional.
 */
export function ModerationForm({
  targetUserId,
  targetAssetId,
  canReinstate,
  compact = false,
}: {
  targetUserId?: string;
  targetAssetId?: string;
  canReinstate: boolean;
  compact?: boolean;
}) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState(moderateAction, EMPTY_ACTION_STATE);
  const [open, setOpen] = useState(!compact);

  if (compact && !open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <ShieldAlert className="size-4" />
        {d.admin.moderate}
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3">
      {targetUserId ? <input type="hidden" name="targetUserId" value={targetUserId} /> : null}
      {targetAssetId ? <input type="hidden" name="targetAssetId" value={targetAssetId} /> : null}

      <Field label={d.admin.reason} error={state.fieldErrors?.reason}>
        <Input name="reason" placeholder={d.admin.reasonPlaceholder} required minLength={8} />
      </Field>

      <FormError>{state.error}</FormError>
      <FormSuccess>{state.success}</FormSuccess>

      <div className="flex flex-wrap gap-2">
        {canReinstate ? (
          <Button
            type="submit"
            name="action"
            value={ModerationActionType.REINSTATE}
            size="sm"
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {d.admin.reinstate}
          </Button>
        ) : (
          <Button
            type="submit"
            name="action"
            value={ModerationActionType.SUSPEND}
            variant="secondary"
            size="sm"
            disabled={pending}
          >
            {d.admin.suspend}
          </Button>
        )}
        <Button
          type="submit"
          name="action"
          value={ModerationActionType.REMOVE}
          variant="danger"
          size="sm"
          disabled={pending}
          title={d.admin.confirmRemove}
        >
          {d.admin.remove}
        </Button>
        {compact ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {d.common.cancel}
          </Button>
        ) : null}
      </div>
      <p className="text-[11px] text-muted">{d.admin.confirmRemove}</p>
    </form>
  );
}
