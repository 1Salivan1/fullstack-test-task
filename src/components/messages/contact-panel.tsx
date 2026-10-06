"use client";

import { useActionState, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { startConversationAction } from "@/lib/actions/messages";
import { EMPTY_ACTION_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Field, FormError, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/display";

export function ContactPanel({
  counterpartyId,
  counterpartyName,
  assetId,
  direction,
}: {
  counterpartyId: string;
  counterpartyName: string;
  assetId?: string;
  direction: "buyerToSeller" | "sellerToBuyer";
}) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState(startConversationAction, EMPTY_ACTION_STATE);
  const [body, setBody] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftSource, setDraftSource] = useState<"ai" | "heuristic" | null>(null);

  async function draft() {
    setDrafting(true);
    try {
      const response = await fetch("/api/ai/draft-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ counterpartyId, assetId, direction }),
      });
      if (response.ok) {
        const data: { text: string; source: "ai" | "heuristic" } = await response.json();
        setBody(data.text);
        setDraftSource(data.source);
      }
    } finally {
      setDrafting(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="counterpartyId" value={counterpartyId} />
      {assetId ? <input type="hidden" name="assetId" value={assetId} /> : null}

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          {d.messages.firstMessageTo(counterpartyName)}
        </h3>
        {draftSource === "heuristic" ? <Badge tone="warning">{d.ai.heuristicMode}</Badge> : null}
      </div>

      <Field error={state.fieldErrors?.body}>
        <Textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={d.messages.placeholder}
          rows={8}
          required
        />
      </Field>

      <FormError>{state.error}</FormError>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || body.trim().length < 2}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {d.common.send}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void draft()} disabled={drafting}>
          {drafting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {drafting ? d.ai.draftRunning : d.ai.draftRun}
        </Button>
      </div>
    </form>
  );
}
