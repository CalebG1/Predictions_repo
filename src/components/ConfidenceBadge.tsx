import type { Confidence } from "../domain/types";
import { CONFIDENCE_LABEL } from "../domain/cyberForecast";

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span
      className={
        confidence === "high"
          ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
          : confidence === "low"
            ? "rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
            : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
      }
      title="Model confidence in this estimate"
    >
      {CONFIDENCE_LABEL[confidence]} confidence
    </span>
  );
}
