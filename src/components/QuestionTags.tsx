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
    <div className="flex flex-wrap gap-1">
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {importanceLabel(q.impactLevel)}
      </span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {q.category}
      </span>
      {extra.map((tag) => (
        <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tag}
        </span>
      ))}
    </div>
  );
}
