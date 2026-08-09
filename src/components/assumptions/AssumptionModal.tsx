import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ASSUMPTION_CONFIDENCE_LABELS } from "../../domain/assumptions";
import type { AssumptionConfidence, QuestionAssumption } from "../../domain/types";

const CONFIDENCE_OPTIONS: AssumptionConfidence[] = ["low", "medium", "high"];

export default function AssumptionModal({
  open,
  assumption,
  onClose,
  onCreate,
  onSave,
}: {
  open: boolean;
  /** null = creating a new assumption; otherwise editing this one. */
  assumption: QuestionAssumption | null;
  onClose: () => void;
  onCreate?: (input: { statement: string; rationale?: string; confidence?: AssumptionConfidence }) => void;
  onSave?: (patch: { statement: string; rationale?: string; confidence?: AssumptionConfidence }) => void;
}) {
  const [statement, setStatement] = useState("");
  const [rationale, setRationale] = useState("");
  const [confidence, setConfidence] = useState<AssumptionConfidence | "">("");

  useEffect(() => {
    if (!open) return;
    setStatement(assumption?.statement ?? "");
    setRationale(assumption?.rationale ?? "");
    setConfidence(assumption?.confidence ?? "");
  }, [open, assumption]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    const trimmed = statement.trim();
    if (!trimmed) return;
    const patch = {
      statement: trimmed,
      rationale: rationale.trim() || undefined,
      confidence: confidence || undefined,
    };
    if (assumption) onSave?.(patch);
    else onCreate?.(patch);
    onClose();
  };

  return createPortal(
    <div className="asrc-overlay" onMouseDown={onClose}>
      <div
        className="asrc-modal assump-modal"
        role="dialog"
        aria-modal="true"
        aria-label={assumption ? "Edit assumption" : "Add assumption"}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="asrc-head">
          <h2 className="asrc-title">{assumption ? "Edit assumption" : "Add local assumption"}</h2>
          <button type="button" className="asrc-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="asrc-body assump-modal-body">
          <label className="assump-field">
            <span className="assump-field-label">Assumption</span>
            <textarea
              rows={2}
              autoFocus
              placeholder="e.g. The vendor will complete its security remediation before the renewal deadline."
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
          </label>

          <label className="assump-field">
            <span className="assump-field-label">Rationale (optional)</span>
            <textarea
              rows={2}
              placeholder="Why do you believe this?"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
            />
          </label>

          <label className="assump-field">
            <span className="assump-field-label">Confidence (optional)</span>
            <select value={confidence} onChange={(e) => setConfidence(e.target.value as AssumptionConfidence | "")}>
              <option value="">Not set</option>
              {CONFIDENCE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {ASSUMPTION_CONFIDENCE_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          <div className="assump-modal-actions">
            <button type="button" className="qcomment-action" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="ctx-primary-btn" disabled={!statement.trim()} onClick={submit}>
              {assumption ? "Save changes" : "Add assumption"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
