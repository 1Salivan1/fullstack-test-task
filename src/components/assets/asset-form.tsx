"use client";

import { useActionState, useRef, useState } from "react";
import { AssetStatus, DealType } from "@prisma/client";
import { Loader2, Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { createAssetAction, updateAssetAction } from "@/lib/actions/assets";
import { EMPTY_ACTION_STATE } from "@/lib/actions/types";
import { CURRENCIES, DEAL_TYPES, JURISDICTIONS, LICENSE_TYPES, SECTORS } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/form";
import { Badge, Card, ScoreBar } from "@/components/ui/display";

type AssetFormValues = {
  id?: string;
  title: string;
  summary: string;
  description: string;
  sector: string;
  jurisdiction: string;
  licenseType: string;
  dealType: DealType;
  currency: string;
  askingPrice: number | null;
  revenue: number | null;
  ebitda: number | null;
  employees: number | null;
  foundedYear: number | null;
  highlights: string[];
  status?: AssetStatus;
};

type Review = {
  score: number;
  issues: string[];
  suggestions: string[];
  suggestedSummary: string | null;
  source: "ai" | "heuristic";
};

const EMPTY_VALUES: AssetFormValues = {
  title: "",
  summary: "",
  description: "",
  sector: SECTORS[0],
  jurisdiction: JURISDICTIONS[0],
  licenseType: "",
  dealType: DealType.FULL_SALE,
  currency: "EUR",
  askingPrice: null,
  revenue: null,
  ebitda: null,
  employees: null,
  foundedYear: null,
  highlights: [],
};

export function AssetForm({ initial }: { initial?: AssetFormValues }) {
  const { d } = useI18n();
  const values = initial ?? EMPTY_VALUES;
  const isEdit = Boolean(values.id);

  const [state, formAction, pending] = useActionState(
    isEdit ? updateAssetAction : createAssetAction,
    EMPTY_ACTION_STATE,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewing, setReviewing] = useState(false);

  /**
   * The review reads the live form, not the saved record, so a seller can check
   * a draft before committing anything to the database.
   */
  async function runReview() {
    if (!formRef.current) return;
    setReviewing(true);
    try {
      const formData = new FormData(formRef.current);
      const payload = Object.fromEntries(formData.entries());
      const response = await fetch("/api/ai/review-listing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) setReview(await response.json());
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form ref={formRef} action={formAction} className="flex flex-col gap-5">
        {values.id ? <input type="hidden" name="assetId" value={values.id} /> : null}

        <Card className="flex flex-col gap-4">
          <Field label={d.assets.form.title} htmlFor="title" error={state.fieldErrors?.title}>
            <Input
              id="title"
              name="title"
              defaultValue={values.title}
              placeholder={d.assets.form.titlePlaceholder}
              required
              minLength={8}
              maxLength={160}
            />
          </Field>

          <Field label={d.assets.form.summary} htmlFor="summary" error={state.fieldErrors?.summary}>
            <Textarea
              id="summary"
              name="summary"
              ref={summaryRef}
              defaultValue={values.summary}
              placeholder={d.assets.form.summaryPlaceholder}
              rows={2}
              required
              minLength={10}
              maxLength={220}
            />
          </Field>

          <Field
            label={d.assets.form.description}
            htmlFor="description"
            error={state.fieldErrors?.description}
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={values.description}
              placeholder={d.assets.form.descriptionPlaceholder}
              rows={10}
            />
          </Field>

          <Field
            label={d.assets.form.highlights}
            hint={d.assets.form.highlightsHint}
            htmlFor="highlights"
          >
            <Textarea
              id="highlights"
              name="highlights"
              defaultValue={values.highlights.join("\n")}
              rows={4}
            />
          </Field>
        </Card>

        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label={d.assets.sector} htmlFor="sector" error={state.fieldErrors?.sector}>
            <Select id="sector" name="sector" defaultValue={values.sector} required>
              {SECTORS.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={d.assets.jurisdiction}
            htmlFor="jurisdiction"
            error={state.fieldErrors?.jurisdiction}
          >
            <Select id="jurisdiction" name="jurisdiction" defaultValue={values.jurisdiction} required>
              {JURISDICTIONS.map((jurisdiction) => (
                <option key={jurisdiction} value={jurisdiction}>
                  {jurisdiction}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={d.assets.license} htmlFor="licenseType">
            <Select id="licenseType" name="licenseType" defaultValue={values.licenseType}>
              <option value="">{d.common.none}</option>
              {LICENSE_TYPES.map((license) => (
                <option key={license} value={license}>
                  {license}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={d.assets.dealType} htmlFor="dealType">
            <Select id="dealType" name="dealType" defaultValue={values.dealType} required>
              {DEAL_TYPES.map((dealType) => (
                <option key={dealType} value={dealType}>
                  {d.dealTypes[dealType]}
                </option>
              ))}
            </Select>
          </Field>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-ink">{d.assets.form.financials}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.assets.form.currency} htmlFor="currency">
              <Select id="currency" name="currency" defaultValue={values.currency}>
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={d.assets.askingPrice}
              hint={d.assets.form.askingPriceHint}
              htmlFor="askingPrice"
            >
              <Input
                id="askingPrice"
                name="askingPrice"
                inputMode="numeric"
                defaultValue={values.askingPrice ?? ""}
              />
            </Field>

            <Field label={d.assets.revenue} hint={d.assets.form.amountHint} htmlFor="revenue">
              <Input id="revenue" name="revenue" inputMode="numeric" defaultValue={values.revenue ?? ""} />
            </Field>

            <Field label={d.assets.ebitda} hint={d.assets.form.amountHint} htmlFor="ebitda">
              <Input id="ebitda" name="ebitda" inputMode="numeric" defaultValue={values.ebitda ?? ""} />
            </Field>

            <Field label={d.assets.employees} htmlFor="employees">
              <Input
                id="employees"
                name="employees"
                inputMode="numeric"
                defaultValue={values.employees ?? ""}
              />
            </Field>

            <Field label={d.assets.founded} htmlFor="foundedYear">
              <Input
                id="foundedYear"
                name="foundedYear"
                inputMode="numeric"
                defaultValue={values.foundedYear ?? ""}
              />
            </Field>
          </div>
        </Card>

        <FormError>{state.error}</FormError>
        <FormSuccess>{state.success}</FormSuccess>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? d.assets.form.submitUpdate : d.assets.form.submitCreate}
          </Button>

          {(!isEdit || values.status === AssetStatus.DRAFT) && (
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="publish" className="accent-accent" />
              {isEdit ? d.assets.form.saveAndPublish : d.assets.publish}
            </label>
          )}
        </div>
      </form>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink">{d.ai.reviewTitle}</h2>
            {review?.source === "heuristic" ? (
              <Badge tone="warning" className="ml-auto">
                {d.ai.heuristicMode}
              </Badge>
            ) : null}
          </div>

          <Button type="button" variant="secondary" onClick={() => void runReview()} disabled={reviewing}>
            {reviewing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {reviewing ? d.ai.reviewRunning : d.ai.reviewRun}
          </Button>

          {review ? (
            <div className="flex flex-col gap-3">
              <ScoreBar value={review.score} label={d.ai.reviewScore} />

              {review.issues.length === 0 && review.suggestions.length === 0 ? (
                <p className="text-sm text-accent">{d.ai.reviewClean}</p>
              ) : null}

              {review.issues.length > 0 ? (
                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
                    <TriangleAlert className="size-3.5" />
                    {d.ai.reviewIssues}
                  </h3>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {review.issues.map((issue) => (
                      <li key={issue} className="text-xs leading-relaxed text-muted">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {review.suggestions.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {d.ai.reviewSuggestions}
                  </h3>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {review.suggestions.map((suggestion) => (
                      <li key={suggestion} className="text-xs leading-relaxed text-muted">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {review.suggestedSummary ? (
                <div className="rounded-lg border border-accent/30 bg-accent-soft/40 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {d.ai.reviewSuggestedSummary}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink">{review.suggestedSummary}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => {
                      if (summaryRef.current && review.suggestedSummary) {
                        summaryRef.current.value = review.suggestedSummary;
                      }
                    }}
                  >
                    {d.ai.useSuggestion}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </aside>
    </div>
  );
}
