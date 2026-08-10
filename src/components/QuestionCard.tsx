import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";
import TouchpointIcons from "./TouchpointIcons";
import QuestionOverflowMenu from "./QuestionOverflowMenu";
import VisibilityBadge from "./VisibilityBadge";
import { pct } from "./ui";
import { Card, CardContent } from "./ui/card";

export default function QuestionCard({ q }: { q: ForecastQuestion }) {
  const { yesOutcome, touchpointSignalsFor } = useStore();
  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;
  const signals = touchpointSignalsFor(q.id);

  return (
    <Card className="flex min-h-52 flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex justify-end">
          <QuestionOverflowMenu q={q} probability={p} />
        </div>

        <Link to={`/q/${q.id}`} className="flex flex-1 flex-col gap-4">
          <h3 className="text-base font-semibold leading-snug text-foreground">{q.title}</h3>

          <div>
            <div className="text-3xl font-semibold tracking-tight text-primary">{pct(p)}</div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3">
            <TouchpointIcons questionId={q.id} signals={signals} />
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>resolves {q.resolutionDate}</span>
              <VisibilityBadge value={q.visibility} owningTeam={q.owningTeam} />
            </span>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
