import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ForecastQuestion } from "../domain/types";
import { useStore } from "../store";

export default function DeleteQuestionModal({
  open,
  q,
  onClose,
}: {
  open: boolean;
  q: ForecastQuestion;
  onClose: () => void;
}) {
  const { hideQuestion, deleteQuestion } = useStore();

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

  const handleHide = () => {
    hideQuestion(q.id);
    onClose();
  };

  const handleDelete = () => {
    deleteQuestion(q.id);
    onClose();
  };

  return createPortal(
    <div className="alert-overlay" onMouseDown={onClose}>
      <div
        className="alert-modal del-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Delete question"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="alert-head">
          <div>
            <h2 className="alert-title">Delete question?</h2>
          </div>
          <button type="button" className="alert-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="alert-body">
          <p className="del-warning">
            Deleting will remove this question for <strong>everyone</strong> in your organization. This cannot be undone.
          </p>
          <div className="alert-question">
            <span className="alert-q-label">Question</span>
            <span className="alert-q-title">{q.title}</span>
          </div>
        </div>

        <footer className="alert-foot del-foot">
          <button type="button" className="alert-btn secondary" onClick={handleHide}>
            Hide for me
          </button>
          <button type="button" className="alert-btn danger" onClick={handleDelete}>
            Delete
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
