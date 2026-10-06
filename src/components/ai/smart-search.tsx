"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/display";
import { assetFiltersToQuery } from "@/lib/filters/asset-filters";
import type { ParsedAssetQuery } from "@/lib/ai/features/parse-query";
import { cn } from "@/lib/utils";

type Response = { filters: ParsedAssetQuery; source: "ai" | "heuristic"; aiConfigured: boolean };

export function SmartSearch({ className }: { className?: string }) {
  const { d } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [result, setResult] = useState<Response | null>(null);
  const [isNavigating, startTransition] = useTransition();

  async function run() {
    if (!query.trim()) return;
    setStatus("loading");
    setResult(null);
    try {
      const response = await fetch("/api/ai/parse-query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const data: Response = await response.json();
      const { filters } = data;
      const hasSignal =
        filters.sectors.length ||
        filters.jurisdictions.length ||
        filters.licenses.length ||
        filters.dealTypes.length ||
        filters.priceMin !== null ||
        filters.priceMax !== null ||
        filters.q;

      if (!hasSignal) {
        setStatus("empty");
        return;
      }

      setResult(data);
      setStatus("idle");
      startTransition(() => {
        router.push(`/assets${assetFiltersToQuery({ ...filters, page: 1 })}`);
      });
    } catch {
      setStatus("error");
    }
  }

  const busy = status === "loading" || isNavigating;

  return (
    <section className={cn("rounded-xl border border-border bg-surface p-5", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        <h2 className="text-sm font-semibold text-ink">{d.ai.smartSearch}</h2>
        {result?.source === "heuristic" || result?.aiConfigured === false ? (
          <Badge tone="warning" className="ml-auto">
            {d.ai.heuristicMode}
          </Badge>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-muted">{d.ai.smartSearchHint}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void run();
            }
          }}
          placeholder={d.ai.smartSearchPlaceholder}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/70"
        />
        <Button type="button" onClick={() => void run()} disabled={busy || !query.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {d.ai.smartSearchRun}
        </Button>
      </div>

      {status === "empty" ? (
        <p className="mt-2 text-xs text-warning">{d.ai.smartSearchNothing}</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-2 text-xs text-danger">{d.common.somethingWentWrong}</p>
      ) : null}

      {result ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">{d.ai.smartSearchApplied}:</span>
          {result.filters.sectors.map((value) => (
            <Badge key={`s-${value}`} tone="accent">
              {value}
            </Badge>
          ))}
          {result.filters.jurisdictions.map((value) => (
            <Badge key={`j-${value}`} tone="accent">
              {value}
            </Badge>
          ))}
          {result.filters.licenses.map((value) => (
            <Badge key={`l-${value}`} tone="accent">
              {value}
            </Badge>
          ))}
          {result.filters.dealTypes.map((value) => (
            <Badge key={`d-${value}`} tone="accent">
              {d.dealTypes[value]}
            </Badge>
          ))}
          {result.filters.priceMin !== null ? (
            <Badge tone="accent">{`≥ ${result.filters.priceMin.toLocaleString()}`}</Badge>
          ) : null}
          {result.filters.priceMax !== null ? (
            <Badge tone="accent">{`≤ ${result.filters.priceMax.toLocaleString()}`}</Badge>
          ) : null}
          {result.filters.q ? <Badge>{result.filters.q}</Badge> : null}
        </div>
      ) : null}
    </section>
  );
}
