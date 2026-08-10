import { Link, useParams } from "react-router-dom";
import { useStore } from "../store";
import { categoryColors, pct } from "../components/ui";
import { Card, CardContent } from "../components/ui/card";

export default function QuestionEmbed() {
  const { id } = useParams();
  const { questions, yesOutcome } = useStore();
  const q = questions.find((x) => x.id === id);

  if (!q) {
    return (
      <main className="min-h-screen bg-background p-4">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-5 text-sm text-muted-foreground">
            <p>Forecast unavailable</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;

  return (
    <main className="min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: categoryColors[q.category] }}
            >
              {q.category}
            </span>
            <span className="text-2xl font-bold tabular-nums">{pct(p)}</span>
          </div>
          <h2 className="text-lg font-semibold leading-snug">{q.title}</h2>
          <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
            <span>Resolves {q.resolutionDate}</span>
            <Link to={`/q/${q.id}`} target="_blank" rel="noopener noreferrer">
              Open →
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
