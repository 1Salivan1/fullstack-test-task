"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { loginAction } from "@/lib/actions/auth";
import { EMPTY_ACTION_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState(loginAction, EMPTY_ACTION_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label={d.auth.email} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field label={d.auth.password} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <FormError>{state.error}</FormError>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {d.auth.submitLogin}
      </Button>
    </form>
  );
}
