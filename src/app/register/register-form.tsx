"use client";

import { useActionState, useState } from "react";
import { Role } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { registerAction } from "@/lib/actions/auth";
import { EMPTY_ACTION_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState(registerAction, EMPTY_ACTION_STATE);
  const [role, setRole] = useState<"BUYER" | "SELLER">(Role.BUYER);

  const options: Array<{ value: "BUYER" | "SELLER"; label: string; hint: string }> = [
    { value: Role.BUYER, label: d.roles.BUYER, hint: d.auth.roleBuyerHint },
    { value: Role.SELLER, label: d.roles.SELLER, hint: d.auth.roleSellerHint },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={d.auth.role}>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              aria-pressed={role === option.value}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                role === option.value
                  ? "border-accent/60 bg-accent-soft"
                  : "border-border bg-surface-2 hover:border-border-strong",
              )}
            >
              <span
                className={cn(
                  "block text-sm font-medium",
                  role === option.value ? "text-accent" : "text-ink",
                )}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="role" value={role} />
      </Field>

      <Field label={d.auth.name} htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>

      <Field label={d.auth.companyName} htmlFor="companyName" error={state.fieldErrors?.companyName}>
        <Input id="companyName" name="companyName" autoComplete="organization" required />
      </Field>

      <Field label={d.auth.country} htmlFor="country" error={state.fieldErrors?.country}>
        <Input id="country" name="country" autoComplete="country-name" required />
      </Field>

      <Field label={d.auth.email} htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field label={d.auth.password} htmlFor="password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <FormError>{state.error}</FormError>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {d.auth.submitRegister}
      </Button>
    </form>
  );
}
