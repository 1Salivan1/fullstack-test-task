"use client";

import { useActionState } from "react";
import { DealType, InvestorType, Visibility } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { saveMandateAction } from "@/lib/actions/buyer-profile";
import { EMPTY_ACTION_STATE } from "@/lib/actions/types";
import { CURRENCIES, DEAL_TYPES, INVESTOR_TYPES, JURISDICTIONS, SECTORS, TIMELINES } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { CheckboxChips, Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/display";

export type MandateValues = {
  companyName: string;
  country: string;
  investorType: InvestorType;
  thesis: string;
  sectors: string[];
  geographies: string[];
  dealTypes: DealType[];
  ticketMin: number | null;
  ticketMax: number | null;
  currency: string;
  timeline: string;
  visibility: Visibility;
};

export function MandateForm({ values }: { values: MandateValues }) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState(saveMandateAction, EMPTY_ACTION_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label={d.auth.companyName} htmlFor="companyName" error={state.fieldErrors?.companyName}>
          <Input id="companyName" name="companyName" defaultValue={values.companyName} required />
        </Field>

        <Field label={d.auth.country} htmlFor="country" error={state.fieldErrors?.country}>
          <Input id="country" name="country" defaultValue={values.country} required />
        </Field>

        <Field label={d.buyers.form.investorType} htmlFor="investorType">
          <Select id="investorType" name="investorType" defaultValue={values.investorType}>
            {INVESTOR_TYPES.map((type) => (
              <option key={type} value={type}>
                {d.investorTypes[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={d.buyers.form.timeline} htmlFor="timeline">
          <Select id="timeline" name="timeline" defaultValue={values.timeline}>
            <option value="">{d.common.none}</option>
            {TIMELINES.map((timeline) => (
              <option key={timeline} value={timeline}>
                {timeline}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card>
        <Field label={d.buyers.form.thesis} htmlFor="thesis">
          <Textarea
            id="thesis"
            name="thesis"
            defaultValue={values.thesis}
            placeholder={d.buyers.form.thesisPlaceholder}
            rows={6}
            maxLength={2000}
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <Field label={d.buyers.sectors}>
          <CheckboxChips name="sectors" options={SECTORS} selected={values.sectors} />
        </Field>
        <Field label={d.buyers.geographies}>
          <CheckboxChips name="geographies" options={JURISDICTIONS} selected={values.geographies} />
        </Field>
        <Field label={d.buyers.dealTypes}>
          <CheckboxChips
            name="dealTypes"
            options={DEAL_TYPES}
            selected={values.dealTypes}
            labels={d.dealTypes}
          />
        </Field>
      </Card>

      <Card className="grid gap-4 sm:grid-cols-3">
        <Field label={d.assets.form.currency} htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={values.currency}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={d.buyers.form.ticketMin} htmlFor="ticketMin" error={state.fieldErrors?.ticketMin}>
          <Input
            id="ticketMin"
            name="ticketMin"
            inputMode="numeric"
            defaultValue={values.ticketMin ?? ""}
          />
        </Field>
        <Field label={d.buyers.form.ticketMax} htmlFor="ticketMax" error={state.fieldErrors?.ticketMax}>
          <Input
            id="ticketMax"
            name="ticketMax"
            inputMode="numeric"
            defaultValue={values.ticketMax ?? ""}
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-ink">{d.buyers.form.visibility}</h2>
        {[Visibility.PUBLIC, Visibility.ANONYMOUS].map((option) => (
          <label key={option} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              value={option}
              defaultChecked={values.visibility === option}
              className="mt-1 accent-accent"
            />
            <span>
              <span className="block text-ink">{d.visibility[option]}</span>
              <span className="block text-xs text-muted">
                {option === Visibility.PUBLIC ? d.visibility.publicHint : d.visibility.anonymousHint}
              </span>
            </span>
          </label>
        ))}
      </Card>

      <FormError>{state.error}</FormError>
      <FormSuccess>{state.success}</FormSuccess>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? d.common.saving : d.common.save}
        </Button>
      </div>
    </form>
  );
}
