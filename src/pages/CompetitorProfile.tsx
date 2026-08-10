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
    <div className="comp-tab-panel">
      <dl className="comp-fact-strip">
        {d.facts.map((f) => (
          <div className="comp-fact-pair" key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="comp-dossier-block">
        <h3>Strategic posture</h3>
        <p>{d.strategySummary}</p>
      </div>

      <div className="comp-compare-grid">
        <div className="comp-compare-card comp-compare-us">
          <h3>Where we win</h3>
          <ul>
            {d.whereWeWin.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="comp-compare-card comp-compare-them">
          <h3>Where {competitor.name} wins</h3>
          <ul>
            {d.whereTheyWin.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="comp-dossier-block">
        <h3>Signals we're watching</h3>
        <ul className="comp-signal-list">
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

function EvidenceTab({ rows }: { rows: { evidence: EvidenceSource; question: ForecastQuestion }[] }) {
  const navigate = useNavigate();

  return (
    <div className="comp-tab-panel">
      {rows.length === 0 ? (
        <p className="dash-sub">No evidence collected yet.</p>
      ) : (
        <div className="evidence-table-wrap">
          <table className="evidence-table comp-evidence-table">
            <thead>
              <tr>
                <th>Source</th>
                <th className="comp-ev-date-col">Date</th>
                <th>Forecast</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ evidence, question }) => (
                <tr
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
                  <td className="evidence-cell-source">
                    <div className="evidence-source-main">
                      <span className="comp-badge">{evidenceKindLabel(evidence)}</span>
                      <span className="evidence-source-title">{evidence.title}</span>
                    </div>
                    <span className="evidence-source-sub">{evidenceSubtitle(evidence)}</span>
                  </td>
                  <td className="evidence-cell-date comp-ev-date-col">{evidence.retrievedAt.slice(0, 10)}</td>
                  <td className="comp-ev-forecast-col">
                    <span className="comp-ev-forecast-link">{question.title}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <article className="comp-intel-card">
      <header className="comp-intel-card-head">
        <span className={`comp-intel-kind comp-intel-kind-${item.kind}`}>{intelKindLabel[item.kind]}</span>
        <span className="comp-intel-meta">
          {item.author.split(" (")[0]} · {item.createdAt.slice(0, 10)}
          {item.editedAt && " · edited"}
        </span>
        <span className="comp-intel-actions">
          <button type="button" className="comp-intel-action" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="comp-intel-action danger" aria-label="Delete" onClick={onDelete}>
            Delete
          </button>
        </span>
      </header>
      <p className="comp-intel-body">{item.body}</p>
      {item.sourceUrl && (
        <a className="comp-intel-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
          {item.sourceUrl.replace(/^https?:\/\//, "").slice(0, 64)}
          {item.sourceUrl.length > 72 ? "…" : ""}
        </a>
      )}
      {linked && (
        <Link to={`/q/${linked.id}`} className="comp-intel-forecast">
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
    <div className="comp-intel-form">
      <div className="comp-intel-kind-row">
        {(Object.keys(intelKindLabel) as IntelKind[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`comp-intel-kind-btn${kind === k ? " active" : ""}`}
            onClick={() => setKind(k)}
          >
            {intelKindLabel[k]}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={4}
        aria-label="Intel note"
      />
      <div className="comp-intel-form-row">
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="Source URL"
          aria-label="Source URL"
        />
        <select value={questionId} onChange={(e) => setQuestionId(e.target.value)} aria-label="Link to forecast">
          <option value="">Link to forecast…</option>
          {forecasts.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title.length > 60 ? `${f.title.slice(0, 60)}…` : f.title}
            </option>
          ))}
        </select>
      </div>
      <div className="comp-intel-form-actions">
        {onCancel && (
          <button type="button" className="comp-intel-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="button" className="comp-intel-submit" onClick={submit} disabled={!body.trim()}>
          {submitLabel}
        </button>
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
    <div className="comp-tab-panel">
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
        <div className="comp-intel-list">
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

  const forecastOptions: ForecastOption[] = rows.map((r) => ({ id: r.question.id, title: r.question.title }));

  return (
    <div className="dash-page comp-profile-page">
      <div className="dash-head comp-profile-head">
        <div className="comp-hero">
          <CompetitorAvatar competitor={competitor} size="lg" />
          <div>
            <nav className="detail-breadcrumbs" aria-label="Competitor">
              <Link to="/competitors">Competitors</Link>
              <span className="detail-crumb-sep" aria-hidden="true">
                ·
              </span>
              <span>{competitor.name}</span>
            </nav>
            <h1>{competitor.name}</h1>
            <p className="dash-sub">{competitor.description}</p>
          </div>
        </div>
      </div>

      <nav className="comp-profile-tabs" aria-label="Company sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`comp-profile-tab${tab === t.id ? " active" : ""}`}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "forecasts" && (
        <div className="comp-tab-panel">
          <QuestionTable questions={competitorQuestions} />
        </div>
      )}
      {tab === "profile" && <DossierTab competitor={competitor} />}
      {tab === "intel" && (
        <IntelTab competitorId={competitor.id} competitorName={competitor.name} forecasts={forecastOptions} />
      )}
      {tab === "evidence" && <EvidenceTab rows={evidenceRows} />}
    </div>
  );
}
