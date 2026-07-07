import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { Category, SourceClass, Visibility } from "../domain/types";
import { findSimilarQuestions, type EvidenceDraft } from "../domain/generateQuestion";
import { questions as seedQuestions } from "../domain/seed";
import { useStore } from "../store";
import CategoryPicker from "./CategoryPicker";
import VisibilityPicker from "./VisibilityPicker";
import { IconPlus } from "./icons";

const SOURCE_CLASSES: { value: SourceClass; label: string }[] = [
  { value: "org_internal", label: "Internal" },
  { value: "gov_stats", label: "Government stats" },
  { value: "central_bank", label: "Central bank" },
  { value: "market_data", label: "Market data" },
  { value: "nowcasting", label: "Nowcasting" },
  { value: "corporate_demand", label: "Corporate / primary" },
  { value: "fast_feed", label: "News / fast feed" },
];

const STEPS = [
  { title: "Question" },
  { title: "Classification" },
  { title: "Resolution & evidence" },
] as const;

const emptyEvidence = (): EvidenceDraft => ({
  title: "",
  url: "",
  sourceClass: "org_internal",
});

interface FormState {
  title: string;
  description: string;
  resolutionCriteria: string;
  resolutionSource: string;
  resolutionDate: string;
  impactEstimate: string;
  category: Category;
  visibility: Visibility;
  evidence: EvidenceDraft[];
}

const defaultForm = (category: Category = "Operational"): FormState => ({
  title: "",
  description: "",
  resolutionCriteria: "",
  resolutionSource: "",
  resolutionDate: "",
  impactEstimate: "",
  category,
  visibility: "public",
  evidence: [emptyEvidence()],
});

function IconArrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      {direction === "left" ? (
        <>
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </>
      ) : (
        <>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </>
      )}
    </svg>
  );
}

export default function CreateQuestionModal({
  open,
  onClose,
  defaultCategory,
}: {
  open: boolean;
  onClose: () => void;
  defaultCategory?: Category;
}) {
  const navigate = useNavigate();
  const { startForecastJob, user } = useStore();
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [similarDismissed, setSimilarDismissed] = useState(false);

  const similar = useMemo(
    () => findSimilarQuestions(form.title, seedQuestions, 12),
    [form.title]
  );

  const showSimilar =
    step === 0 &&
    form.title.trim().length >= 3 &&
    !similarDismissed &&
    similar.length > 0;

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm(defaultCategory));
    setStep(0);
    setSubmitting(false);
    setSimilarDismissed(false);
  }, [open, defaultCategory]);

  useEffect(() => {
    setSimilarDismissed(false);
  }, [form.title]);

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

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const step0Complete = form.title.trim().length >= 5 && form.description.trim().length > 0;
  const step1Complete = form.impactEstimate.trim().length > 0;
  const step2Complete =
    form.resolutionCriteria.trim().length > 0 &&
    form.resolutionSource.trim().length > 0 &&
    form.resolutionDate.trim().length > 0;
  const stepComplete = [step0Complete, step1Complete, step2Complete][step];
  const canSubmit = step0Complete && step1Complete && step2Complete && !submitting;
  const canGoNext = stepComplete;
  const showNav = step > 0 || step0Complete;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEvidence = (index: number, patch: Partial<EvidenceDraft>) => {
    setForm((prev) => ({
      ...prev,
      evidence: prev.evidence.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const addEvidenceRow = () => {
    setForm((prev) => ({ ...prev, evidence: [...prev.evidence, emptyEvidence()] }));
  };

  const removeEvidenceRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      evidence: prev.evidence.length <= 1 ? [emptyEvidence()] : prev.evidence.filter((_, i) => i !== index),
    }));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => {
    if (!canGoNext) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const job = startForecastJob({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      resolutionCriteria: form.resolutionCriteria.trim() || undefined,
      resolutionSource: form.resolutionSource.trim() || undefined,
      resolutionDate: form.resolutionDate.trim() || undefined,
      impactEstimate: form.impactEstimate.trim() || undefined,
      category: form.category,
      visibility: form.visibility,
      evidence: form.evidence.filter((e) => e.title.trim()),
    });
    onClose();
    navigate(`/forecast/${job.id}/processing`);
  };

  return createPortal(
    <div className="cq-overlay" onMouseDown={onClose}>
      <div
        className="cq-modal cq-modal-form"
        role="dialog"
        aria-modal="true"
        aria-label="Create a forecast"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="cq-head">
          <div>
            <h2 className="cq-title">Create a forecast</h2>
          </div>
          <button type="button" className="cq-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="cq-progress" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.title} className={`cq-progress-dot${i <= step ? " done" : ""}${i === step ? " active" : ""}`} />
          ))}
        </div>

        <div className="cq-body cq-form">
          {step === 0 && (
            <>
              <label className="cq-field">
                <span className="cq-label">Question title</span>
                <input
                  type="text"
                  className="cq-input"
                  placeholder="Will the Fed cut rates at the September meeting?"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  autoFocus
                />
              </label>

              {showSimilar && (
                <div className="cq-similar">
                  <div className="cq-similar-head">
                    <span className="cq-similar-label">Similar existing questions</span>
                    <button
                      type="button"
                      className="cq-similar-close"
                      aria-label="Dismiss similar questions"
                      onClick={() => setSimilarDismissed(true)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <ul className="cq-similar-list">
                    {similar.map((q) => (
                      <li key={q.id}>
                        <button
                          type="button"
                          className="cq-similar-item"
                          onClick={() => navigate(`/q/${q.id}`)}
                        >
                          <span className="cq-similar-text">{q.title}</span>
                          <span className="cq-similar-chevron" aria-hidden="true">›</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="cq-field">
                <span className="cq-label">Description</span>
                <textarea
                  className="cq-textarea"
                  placeholder="What exactly must happen, by when, and under what conditions?"
                  rows={4}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <div className="cq-row cq-row-pickers">
                <div className="cq-field">
                  <span className="cq-label">Category</span>
                  <CategoryPicker value={form.category} onChange={(c) => update("category", c)} />
                </div>
                <div className="cq-field">
                  <span className="cq-label">Visibility</span>
                  <VisibilityPicker
                    value={form.visibility}
                    owningTeam={user.team}
                    onChange={(v) => update("visibility", v)}
                  />
                </div>
              </div>

              <label className="cq-field">
                <span className="cq-label">Impact if true</span>
                <input
                  type="text"
                  className="cq-input"
                  placeholder="e.g. ~$30M revenue at risk"
                  value={form.impactEstimate}
                  onChange={(e) => update("impactEstimate", e.target.value)}
                  autoFocus
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <label className="cq-field">
                <span className="cq-label">Resolution criteria</span>
                <textarea
                  className="cq-textarea"
                  placeholder="How will this resolve YES or NO? Cite observable thresholds and authoritative sources."
                  rows={3}
                  value={form.resolutionCriteria}
                  onChange={(e) => update("resolutionCriteria", e.target.value)}
                  autoFocus
                />
              </label>

              <div className="cq-row">
                <label className="cq-field">
                  <span className="cq-label">Resolution source</span>
                  <input
                    type="text"
                    className="cq-input"
                    placeholder="e.g. FOMC statement, SEC EDGAR"
                    value={form.resolutionSource}
                    onChange={(e) => update("resolutionSource", e.target.value)}
                  />
                </label>
                <label className="cq-field">
                  <span className="cq-label">Resolution date</span>
                  <input
                    type="date"
                    className="cq-input"
                    value={form.resolutionDate}
                    onChange={(e) => update("resolutionDate", e.target.value)}
                  />
                </label>
              </div>

              <div className="cq-evidence">
                <div className="cq-evidence-head">
                  <span className="cq-label">Evidence sources</span>
                  <button type="button" className="cq-evidence-add" onClick={addEvidenceRow}>
                    Add source
                  </button>
                </div>
                <div className="cq-evidence-list">
                  {form.evidence.map((row, index) => (
                    <div key={index} className="cq-evidence-row">
                      <input
                        type="text"
                        className="cq-input"
                        placeholder="Source title"
                        value={row.title}
                        onChange={(e) => updateEvidence(index, { title: e.target.value })}
                      />
                      <input
                        type="url"
                        className="cq-input"
                        placeholder="URL (optional)"
                        value={row.url ?? ""}
                        onChange={(e) => updateEvidence(index, { url: e.target.value })}
                      />
                      <select
                        className="cq-select"
                        value={row.sourceClass ?? "org_internal"}
                        onChange={(e) => updateEvidence(index, { sourceClass: e.target.value as SourceClass })}
                      >
                        {SOURCE_CLASSES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="cq-evidence-remove"
                        aria-label="Remove evidence source"
                        onClick={() => removeEvidenceRow(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {showNav && (
          <footer className={`cq-foot cq-foot-nav${isLast ? " cq-foot-last" : ""}`}>
            {!isFirst ? (
              <button
                type="button"
                className="cq-nav-btn"
                aria-label="Previous step"
                onClick={goBack}
              >
                <IconArrow direction="left" />
              </button>
            ) : (
              <span className="cq-nav-spacer" aria-hidden="true" />
            )}

            {isLast ? (
              <button
                type="button"
                className="alert-btn primary cq-submit cq-create-btn"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? "Creating…" : "Create forecast"}
              </button>
            ) : (
              <button
                type="button"
                className="cq-nav-btn"
                aria-label="Next step"
                disabled={!canGoNext}
                onClick={goNext}
              >
                <IconArrow direction="right" />
              </button>
            )}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

export function AddQuestionButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="cq-add-btn" onClick={onClick}>
      <IconPlus />
      Add Question
    </button>
  );
}
