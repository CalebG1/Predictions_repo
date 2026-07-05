import { questionTags } from "../domain/questionTags";
import type { ForecastQuestion, ImpactLevel } from "../domain/types";
import { impactLevelLabel } from "./ui";

function importanceLabel(level: ImpactLevel): string {
  if (level === "critical" || level === "high") return "High";
  return impactLevelLabel[level];
}

export default function QuestionTags({ q }: { q: ForecastQuestion }) {
  const extra = questionTags[q.id] ?? [];

  return (
    <div className="qt-tags">
      <span className="qt-tag">{importanceLabel(q.impactLevel)}</span>
      <span className="qt-tag">{q.category}</span>
      {extra.map((tag) => (
        <span key={tag} className="qt-tag">
          {tag}
        </span>
      ))}
    </div>
  );
}
