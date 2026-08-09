// Shared UI for the Competitors tab: avatar chip, change-row builder, the
// belief-change feed, the "newly identified moves" popup, and locally
// persisted competitor intel notes.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import type { Competitor } from "../domain/competitors";
import { competitorForQuestion, competitorMoves, competitors, moveForQuestion } from "../domain/competitors";
import type { ForecastQuestion, Outcome, ProbabilityPoint } from "../domain/types";
import { pct } from "./ui";

export function CompetitorAvatar({ competitor, size = "sm" }: { competitor: Competitor; size?: "sm" | "lg" }) {
  return (
    <span
      className={`comp-avatar${size === "lg" ? " comp-avatar-lg" : ""}`}
      style={{ background: competitor.color }}
      aria-hidden="true"
    >
      {competitor.monogram}
    </span>
  );
}

// --- Belief-change rows (PRD: alert on probability moves, not raw news) ---

export interface CompetitorChangeRow {
  question: ForecastQuestion;
  competitor: Competitor;
  from: number;
  to: number;
  trigger: string;
  date: string;
}

/** Per-question probability change over the trailing window, largest moves first. */
export function buildCompetitorChanges(
  questions: ForecastQuestion[],
  yesOutcome: (questionId: string) => Outcome | undefined,
  historyFor: (outcomeId: string) => ProbabilityPoint[],
  days = 7,
): CompetitorChangeRow[] {
  const rows: CompetitorChangeRow[] = [];
  for (const q of questions) {
    const competitor = competitorForQuestion(q.id);
    if (!competitor) continue;
    const yes = yesOutcome(q.id);
    if (!yes) continue;
    const h = historyFor(yes.id);
    if (h.length < 2) continue;
    const latest = h[h.length - 1];
    const cutoff = new Date(latest.timestamp);
    cutoff.setDate(cutoff.getDate() - days);
    const past = [...h].reverse().find((p) => new Date(p.timestamp) <= cutoff) ?? h[0];
    rows.push({
      question: q,
      competitor,
      from: past.probability,
      to: latest.probability,
      trigger: latest.updateTrigger,
      date: latest.timestamp.slice(0, 10),
    });
  }
  rows.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
  return rows;
}

export function CompetitorChangeFeed({ rows, showCompetitor = true }: { rows: CompetitorChangeRow[]; showCompetitor?: boolean }) {
  if (rows.length === 0) {
    return <p className="dash-sub">No forecast changes in this window.</p>;
  }
  return (
    <div className={`feed comp-feed${showCompetitor ? "" : " comp-feed-nowho"}`}>
      {rows.map((r) => {
        const delta = r.to - r.from;
        const up = delta >= 0;
        return (
          <Link to={`/q/${r.question.id}`} key={r.question.id} className="feed-row">
            {showCompetitor && (
              <span className="comp-feed-who">
                <CompetitorAvatar competitor={r.competitor} />
                <span className="comp-feed-name">{r.competitor.name}</span>
              </span>
            )}
            <span className={`feed-delta ${up ? "up" : "down"}`}>
              {up ? "▲" : "▼"} {pct(r.from)} → {pct(r.to)}
            </span>
            <span className="feed-title">{r.question.title}</span>
            <span className="feed-trigger">{r.trigger}</span>
          </Link>
        );
      })}
    </div>
  );
}

// --- Newly identified moves popup ---

export function NewMovesModal({
  open,
  onClose,
  questions,
  yesOutcome,
}: {
  open: boolean;
  onClose: () => void;
  questions: ForecastQuestion[];
  yesOutcome: (questionId: string) => Outcome | undefined;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const rows = competitorMoves
    .filter((m) => m.newlyIdentified)
    .flatMap((move) => {
      const question = questionById.get(move.questionId);
      const competitor = competitors.find((c) => c.id === move.competitorId);
      const yes = yesOutcome(move.questionId);
      if (!question || !competitor || !yes) return [];
      return [{ move, question, competitor, probability: yes.currentProbability }];
    });

  return createPortal(
    <div className="alert-overlay" onMouseDown={onClose}>
      <div
        className="alert-modal comp-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Newly identified moves"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="alert-head">
          <div>
            <h2 className="alert-title">Newly identified moves</h2>
            <p className="comp-modal-sub">
              Candidate competitor actions the question pipeline surfaced from fresh signals — hiring, landing
              pages, executive commentary — and promoted to active forecasts.
            </p>
          </div>
          <button type="button" className="alert-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="comp-modal-body">
          {rows.map(({ move, question, competitor, probability }) => (
            <button
              type="button"
              key={question.id}
              className="comp-new-card"
              onClick={() => {
                onClose();
                navigate(`/q/${question.id}`);
              }}
            >
              <span className="comp-new-head">
                <CompetitorAvatar competitor={competitor} />
                <span className="comp-feed-name">{competitor.name}</span>
                <span className="comp-badge">{move.moveCategory}</span>
              </span>
              <span className="comp-new-body">
                <strong>{pct(probability)}</strong> probability — {question.title}
              </span>
              <span className="comp-horizon">Expected: {move.expectedHorizon}</span>
            </button>
          ))}
          {rows.length === 0 && <p className="dash-sub">No newly identified moves right now.</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function newlyIdentifiedCount(questions: ForecastQuestion[]): number {
  const ids = new Set(questions.map((q) => q.id));
  return competitorMoves.filter((m) => m.newlyIdentified && ids.has(m.questionId)).length;
}

// --- Competitor intel notes (locally persisted, like other user edits) ---

export type IntelKind = "note" | "meeting" | "document" | "news";

export const intelKindLabel: Record<IntelKind, string> = {
  note: "Note",
  meeting: "Meeting",
  document: "Document",
  news: "News",
};

export interface CompetitorIntelItem {
  id: string;
  competitorId: string;
  kind: IntelKind;
  body: string;
  sourceUrl?: string;
  /** Optional link to one of this company's forecasts (internal evidence trail). */
  questionId?: string;
  author: string;
  createdAt: string; // ISO
  editedAt?: string; // ISO
}

const INTEL_STORAGE_KEY = "foresight-competitor-intel";

function loadIntel(): CompetitorIntelItem[] {
  try {
    const raw = localStorage.getItem(INTEL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CompetitorIntelItem[];
  } catch {
    return [];
  }
}

function saveIntel(items: CompetitorIntelItem[]) {
  try {
    localStorage.setItem(INTEL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // best-effort persistence, matching the rest of the app
  }
}

export function useCompetitorIntel(competitorId: string) {
  const [all, setAll] = useState<CompetitorIntelItem[]>(loadIntel);

  const items = all
    .filter((i) => i.competitorId === competitorId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const addItem = (input: {
    kind: IntelKind;
    body: string;
    sourceUrl?: string;
    questionId?: string;
    author: string;
  }) => {
    const item: CompetitorIntelItem = {
      id: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      competitorId,
      kind: input.kind,
      body: input.body,
      sourceUrl: input.sourceUrl || undefined,
      questionId: input.questionId || undefined,
      author: input.author,
      createdAt: new Date().toISOString(),
    };
    setAll((prev) => {
      const next = [...prev, item];
      saveIntel(next);
      return next;
    });
  };

  const updateItem = (
    id: string,
    patch: Partial<Pick<CompetitorIntelItem, "kind" | "body" | "sourceUrl" | "questionId">>,
  ) => {
    setAll((prev) => {
      const next = prev.map((i) =>
        i.id === id
          ? {
              ...i,
              ...patch,
              sourceUrl: patch.sourceUrl !== undefined ? patch.sourceUrl || undefined : i.sourceUrl,
              questionId: patch.questionId !== undefined ? patch.questionId || undefined : i.questionId,
              editedAt: new Date().toISOString(),
            }
          : i,
      );
      saveIntel(next);
      return next;
    });
  };

  const removeItem = (id: string) => {
    setAll((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveIntel(next);
      return next;
    });
  };

  return { items, addItem, updateItem, removeItem };
}

// Re-export commonly paired helpers so pages import from one place.
export { competitorForQuestion, moveForQuestion };
