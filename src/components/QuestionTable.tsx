import { useNavigate } from "react-router-dom";
import { probabilityDelta, useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";
import TouchpointIcons from "./TouchpointIcons";
import QuestionOverflowMenu from "./QuestionOverflowMenu";
import VisibilityBadge from "./VisibilityBadge";
import QuestionTags from "./QuestionTags";
import { IconPin } from "./icons";
import { pct, signedPct } from "./ui";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent } from "./ui/card";

function QuestionTableRow({ q, pinned }: { q: ForecastQuestion; pinned: boolean }) {
  const navigate = useNavigate();
  const { yesOutcome, historyFor, touchpointSignalsFor, togglePin } = useStore();
  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;
  const d1 = yes ? probabilityDelta(historyFor(yes.id), 1) : null;
  const delta = d1 ?? 0;
  const signals = touchpointSignalsFor(q.id);

  const goToQuestion = () => navigate(`/q/${q.id}`);

  return (
    <TableRow
      className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50 focus-visible:bg-muted"
      role="link"
      tabIndex={0}
      onClick={goToQuestion}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToQuestion();
        }
      }}
    >
      <TableCell className="w-10 px-3 py-3" aria-hidden={!pinned}>
        {pinned && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            title="Unpin"
            aria-label="Unpin"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePin(q.id);
            }}
          >
            <IconPin filled />
          </Button>
        )}
      </TableCell>
      <TableCell className="min-w-80 px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{q.title}</span>
          <QuestionTags q={q} />
        </div>
      </TableCell>
      <TableCell className="px-3 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">{pct(p)}</span>
          <span
            className={`text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {signedPct(delta)}%
          </span>
        </div>
      </TableCell>
      <TableCell className="px-3 py-3">
        <TouchpointIcons questionId={q.id} signals={signals} maxVisible={3} />
      </TableCell>
      <TableCell className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
        {q.resolutionDate}
      </TableCell>
      <TableCell className="px-3 py-3">
        <VisibilityBadge value={q.visibility} owningTeam={q.owningTeam} />
      </TableCell>
      <TableCell className="px-3 py-3">
        <QuestionOverflowMenu q={q} probability={p} showPin />
      </TableCell>
    </TableRow>
  );
}

export default function QuestionTable({ questions }: { questions: ForecastQuestion[] }) {
  const { pinnedIds } = useStore();

  return (
    <Card className="p-0">
      <CardContent className="overflow-x-auto p-0">
        <Table className="min-w-[900px]">
          <TableHeader className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <TableRow>
              <TableHead className="w-10" aria-hidden="true" />
              <TableHead>Question</TableHead>
              <TableHead>Probability</TableHead>
              <TableHead>Sources</TableHead>
              <TableHead>Resolves</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => (
              <QuestionTableRow key={q.id} q={q} pinned={pinnedIds.includes(q.id)} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
