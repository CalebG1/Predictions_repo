import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { QuestionAssumption } from "../../domain/types";

type PublishTarget = "viewing" | "default";

const OPTIONS: { id: PublishTarget; title: string; description: string }[] = [
  {
    id: "viewing",
    title: "Publish for viewing",
    description: "Share on your personal perspective so others on this question can read it.",
  },
  {
    id: "default",
    title: "Request for default",
    description: "Propose this assumption for the team's shared working view.",
  },
];

export default function PublishAssumptionModal({
  open,
  assumption,
  onClose,
  onSubmit,
}: {
  open: boolean;
  assumption: QuestionAssumption | null;
  onClose: () => void;
  onSubmit: (target: PublishTarget, rationale?: string) => void;
}) {
  const [target, setTarget] = useState<PublishTarget>("viewing");
  const [rationale, setRationale] = useState("");

  useEffect(() => {
    if (!open) return;
    setTarget("viewing");
    setRationale("");
  }, [open, assumption?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !assumption) return null;

  const submit = () => {
    onSubmit(target, rationale.trim() || undefined);
    onClose();
  };

  return createPortal(
    <div className="asrc-overlay" onMouseDown={onClose}>
      <div
        className="asrc-modal assump-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Publish assumption"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="asrc-head">
          <h2 className="asrc-title">Publish assumption</h2>
          <button type="button" className="asrc-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="asrc-body assump-modal-body">
          <p className="assump-statement-preview muted small">{assumption.statement}</p>
          <p className="muted small assump-publish-intro">
            Choose how you want to publish this assumption. Either option will be submitted for review and your
            assumption status will change to Pending review until a decision is made.
          </p>

          <div className="assump-publish-options" role="radiogroup" aria-label="Publish destination">
            {OPTIONS.map((option) => (
              <label key={option.id} className={`assump-publish-option${target === option.id ? " selected" : ""}`}>
                <input
                  type="radio"
                  name="publish-target"
                  value={option.id}
                  checked={target === option.id}
                  onChange={() => setTarget(option.id)}
                />
                <span className="assump-publish-option-copy">
                  <span className="assump-publish-option-title">{option.title}</span>
                  <span className="muted small">{option.description}</span>
                </span>
              </label>
            ))}
          </div>

          <label className="assump-field">
            <span className="assump-field-label">Note for reviewer (optional)</span>
            <textarea
              rows={2}
              placeholder="Add context for the person reviewing this request…"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
            />
          </label>

          <div className="assump-modal-actions">
            <button type="button" className="qcomment-action" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="ctx-primary-btn" onClick={submit}>
              Submit for review
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
