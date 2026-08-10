// Per-competitor profile: tabbed forecasts, company profile, intel, and evidence.

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import {
  competitorById,
  movesForCompetitor,
  type Competitor,
  type CompetitorMove,
} from "../domain/competitors";
import {
  CompetitorAvatar,
  intelKindLabel,
  useCompetitorIntel,
  type CompetitorIntelItem,
  type IntelKind,
} from "../components/competitors";
import QuestionTable from "../components/QuestionTable";
import type { EvidenceSource, ForecastQuestion } from "../domain/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";

type ProfileTab = "forecasts" | "profile" | "intel" | "evidence";

interface MoveRow {
  move: CompetitorMove;
  question: ForecastQuestion;
  probability: number;
}

interface ForecastOption {
  id: string;
  title: string;
}

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "forecasts", label: "Forecasts" },
  { id: "profile", label: "Company profile" },
  { id: "intel", label: "Company intel" },
  { id: "evidence", label: "Latest evidence" },
];

function DossierTab({ competitor }: { competitor: Competitor }) {
  const d = competitor.dossier;
  return (
    <div className="space-y-6">
      <dl className="grid divide-y rounded-xl border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {d.facts.map((f) => (
          <div className="p-4" key={f.label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-1 text-lg font-semibold">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <h3 className="text-base font-semibold">Strategic posture</h3>
        <p className="text-sm leading-6 text-muted-foreground">{d.strategySummary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <h3 className="font-semibold text-primary">Where we win</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {d.whereWeWin.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Where {competitor.name} wins</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {d.whereTheyWin.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold">Signals we're watching</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {d.watchingFor.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function evidenceKindLabel(e: EvidenceSource): string {
  switch (e.kind) {
    case "app_message":
      return e.app?.app === "teams" ? "Teams" : "Slack";
    case "analysis":
      return "Analysis";
    case "website":
      return "Web";
    case "prediction":
      return "Agent";
    default:
      return "Feed";
  }
}

function evidenceSubtitle(e: EvidenceSource): string {
  if (e.kind === "website" && e.website) return e.website.publisher;
  if (e.kind === "app_message" && e.app) return `${e.app.channel} · ${e.app.author}`;
  if (e.kind === "analysis") return "Ensemble analysis";
  if (e.kind === "prediction" && e.prediction) return e.prediction.agent;
  return e.methodTag ?? e.sourceClass.replace(/_/g, " ");
}

function EvidenceTab({
  rows,
}: {
  rows: { evidence: EvidenceSource; question: ForecastQuestion }[];
}) {
  const navigate = useNavigate();

  return (
    <div>
      {rows.length === 0 ? (
        <p className="dash-sub">No evidence collected yet.</p>
      ) : (
        <div className="evidence-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead>Forecast</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ evidence, question }) => (
                <TableRow
                  key={evidence.id}
                  className="evidence-row"
                  tabIndex={0}
                  role="link"
                  onClick={() => navigate(`/q/${question.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/q/${question.id}`);
                    }
                  }}
                >
                  <TableCell>
                    <div className="evidence-source-main">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {evidenceKindLabel(evidence)}
                      </span>
                      <span className="evidence-source-title">{evidence.title}</span>
                    </div>
                    <span className="evidence-source-sub">{evidenceSubtitle(evidence)}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {evidence.retrievedAt.slice(0, 10)}
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    <span>{question.title}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function IntelItemView({
  item,
  forecasts,
  onEdit,
  onDelete,
}: {
  item: CompetitorIntelItem;
  forecasts: ForecastOption[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const linked = item.questionId ? forecasts.find((f) => f.id === item.questionId) : undefined;
  return (
    <article className="rounded-xl border bg-card p-4">
      <header className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {intelKindLabel[item.kind]}
        </span>
        <span className="text-xs text-muted-foreground">
          {item.author.split(" (")[0]} · {item.createdAt.slice(0, 10)}
          {item.editedAt && " · edited"}
        </span>
        <span className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="xs" onClick={onEdit}>
            Edit
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            aria-label="Delete"
            onClick={onDelete}
          >
            Delete
          </Button>
        </span>
      </header>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.body}</p>
      {item.sourceUrl && (
        <a
          className="mt-3 block truncate text-xs text-primary hover:underline"
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {item.sourceUrl.replace(/^https?:\/\//, "").slice(0, 64)}
          {item.sourceUrl.length > 72 ? "…" : ""}
        </a>
      )}
      {linked && (
        <Link
          to={`/q/${linked.id}`}
          className="mt-3 block rounded-md bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/70"
        >
          Linked forecast · {linked.title}
        </Link>
      )}
    </article>
  );
}

function IntelForm({
  forecasts,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  placeholder,
}: {
  forecasts: ForecastOption[];
  initial?: Pick<CompetitorIntelItem, "kind" | "body" | "sourceUrl" | "questionId">;
  submitLabel: string;
  onSubmit: (v: { kind: IntelKind; body: string; sourceUrl: string; questionId: string }) => void;
  onCancel?: () => void;
  placeholder?: string;
}) {
  const [kind, setKind] = useState<IntelKind>(initial?.kind ?? "note");
  const [body, setBody] = useState(initial?.body ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [questionId, setQuestionId] = useState(initial?.questionId ?? "");

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSubmit({ kind, body: trimmed, sourceUrl: sourceUrl.trim(), questionId });
    if (!initial) {
      setBody("");
      setSourceUrl("");
      setQuestionId("");
    }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(intelKindLabel) as IntelKind[]).map((k) => (
          <Button
            key={k}
            type="button"
            variant={kind === k ? "default" : "secondary"}
            size="sm"
            onClick={() => setKind(k)}
          >
            {intelKindLabel[k]}
          </Button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={4}
        aria-label="Intel note"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="Source URL"
          aria-label="Source URL"
        />
        <Select value={questionId || null} onValueChange={(value) => setQuestionId(value ?? "")}>
          <SelectTrigger className="w-full" aria-label="Link to forecast">
            <SelectValue placeholder="Link to forecast…" />
          </SelectTrigger>
          <SelectContent>
            {forecasts.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.title.length > 60 ? `${f.title.slice(0, 60)}…` : f.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="button" onClick={submit} disabled={!body.trim()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function IntelTab({
  competitorId,
  competitorName,
  forecasts,
}: {
  competitorId: string;
  competitorName: string;
  forecasts: ForecastOption[];
}) {
  const { user } = useStore();
  const { items, addItem, updateItem, removeItem } = useCompetitorIntel(competitorId);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {editingId === null && (
        <IntelForm
          forecasts={forecasts}
          submitLabel="Add intel"
          placeholder={`What do you know about ${competitorName}? Customer chatter, win/loss notes, event takeaways…`}
          onSubmit={(v) =>
            addItem({
              kind: v.kind,
              body: v.body,
              sourceUrl: v.sourceUrl || undefined,
              questionId: v.questionId || undefined,
              author: user.name,
            })
          }
        />
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) =>
            editingId === item.id ? (
              <IntelForm
                key={item.id}
                forecasts={forecasts}
                initial={item}
                submitLabel="Save"
                onCancel={() => setEditingId(null)}
                onSubmit={(v) => {
                  updateItem(item.id, {
                    kind: v.kind,
                    body: v.body,
                    sourceUrl: v.sourceUrl,
                    questionId: v.questionId,
                  });
                  setEditingId(null);
                }}
              />
            ) : (
              <IntelItemView
                key={item.id}
                item={item}
                forecasts={forecasts}
                onEdit={() => setEditingId(item.id)}
                onDelete={() => removeItem(item.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default function CompetitorProfile() {
  const { competitorId } = useParams();
  const { questions, yesOutcome, evidenceFor } = useStore();
  const [tab, setTab] = useState<ProfileTab>("forecasts");

  const competitor = competitorId ? competitorById(competitorId) : undefined;

  const rows = useMemo(() => {
    if (!competitor) return [];
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const list: MoveRow[] = [];
    for (const move of movesForCompetitor(competitor.id)) {
      const question = questionById.get(move.questionId);
      if (!question) continue;
      const yes = yesOutcome(move.questionId);
      if (!yes) continue;
      list.push({
        move,
        question,
        probability: yes.currentProbability,
      });
    }
    list.sort((a, b) => b.probability - a.probability);
    return list;
  }, [competitor, questions, yesOutcome]);

  const competitorQuestions = useMemo(() => rows.map((r) => r.question), [rows]);

  const evidenceRows = useMemo(() => {
    const out: { evidence: EvidenceSource; question: ForecastQuestion }[] = [];
    for (const r of rows) {
      for (const evidence of evidenceFor(r.question.id)) {
        out.push({ evidence, question: r.question });
      }
    }
    out.sort((a, b) => b.evidence.retrievedAt.localeCompare(a.evidence.retrievedAt));
    return out;
  }, [rows, evidenceFor]);

  if (!competitor) {
    return (
      <div className="dash-page">
        <div className="locked-card">
          <h2>Competitor not found</h2>
          <p>This competitor isn't part of the monitored set.</p>
          <Link to="/competitors" className="btn">
            Back to competitors
          </Link>
        </div>
      </div>
    );
  }

  const forecastOptions: ForecastOption[] = rows.map((r) => ({
    id: r.question.id,
    title: r.question.title,
  }));

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-6 px-5 py-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex items-start gap-4">
          <CompetitorAvatar competitor={competitor} size="lg" />
          <div>
            <nav
              className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              aria-label="Competitor"
            >
              <Link to="/competitors">Competitors</Link>
              <span aria-hidden="true">·</span>
              <span>{competitor.name}</span>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight">{competitor.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{competitor.description}</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 border-b" aria-label="Company sections">
        {TABS.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="ghost"
            size="sm"
            className={`rounded-none border-b-2 ${tab === t.id ? "border-b-primary text-primary" : "border-transparent text-muted-foreground"}`}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </nav>

      {tab === "forecasts" && (
        <div>
          <QuestionTable questions={competitorQuestions} />
        </div>
      )}
      {tab === "profile" && <DossierTab competitor={competitor} />}
      {tab === "intel" && (
        <IntelTab
          competitorId={competitor.id}
          competitorName={competitor.name}
          forecasts={forecastOptions}
        />
      )}
      {tab === "evidence" && <EvidenceTab rows={evidenceRows} />}
    </div>
  );
}
