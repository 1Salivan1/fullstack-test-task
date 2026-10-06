import { Sparkles } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { MatchFactor } from "@/lib/matching/score";
import { factorLabel } from "@/lib/matching/present";
import { Badge, ScoreBar } from "@/components/ui/display";

/**
 * Every match shows both layers of reasoning: the rule-based factors (always
 * present, auditable) and the model's one-line rationale when AI is enabled.
 */
export function MatchExplainer({
  d,
  score,
  factors,
  reason,
}: {
  d: Dictionary;
  score: number;
  factors: MatchFactor[];
  reason: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ScoreBar value={score} label={d.ai.matchScore} />

      {reason ? (
        <p className="flex gap-1.5 text-xs leading-relaxed text-ink">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" />
          {reason}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {factors.map((factor) => (
          <Badge key={`${factor.code}-${factor.value ?? ""}`} tone={factor.positive ? "accent" : "neutral"}>
            {factorLabel(d, factor)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
