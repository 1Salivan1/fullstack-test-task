"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { markReadAction, sendMessageAction } from "@/lib/actions/messages";
import { EMPTY_ACTION_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { FormError, Textarea } from "@/components/ui/form";

export function ThreadComposer({
  conversationId,
  disabled,
  disabledReason,
}: {
  conversationId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState(sendMessageAction, EMPTY_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the textarea once the server confirms the send.
  useEffect(() => {
    if (!pending && !state.error && !state.fieldErrors) formRef.current?.reset();
  }, [pending, state]);

  if (disabled) {
    return (
      <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
        {disabledReason}
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <Textarea name="body" placeholder={d.messages.placeholder} rows={3} required minLength={2} />
      <FormError>{state.error ?? state.fieldErrors?.body}</FormError>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {pending ? d.common.sending : d.common.send}
        </Button>
      </div>
    </form>
  );
}

/** Marks the thread read after it has actually been displayed. */
export function MarkThreadRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    void markReadAction(conversationId);
  }, [conversationId]);
  return null;
}
