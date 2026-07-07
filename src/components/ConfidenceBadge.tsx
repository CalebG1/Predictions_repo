import type { Confidence } from "../domain/types";
import { CONFIDENCE_LABEL } from "../domain/cyberForecast";

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className={`conf-badge conf-${confidence}`} title="Model confidence in this estimate">
      {CONFIDENCE_LABEL[confidence]} confidence
    </span>
  );
}
