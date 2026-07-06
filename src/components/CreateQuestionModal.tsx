import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { findSimilarQuestions } from "../domain/generateQuestion";
import { questions as seedQuestions } from "../domain/seed";
import { useStore } from "../store";
import { IconPlus } from "./icons";

function IconSparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" />
    </svg>
  );
}

function IconNews() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
    </svg>
  );
}

export default function CreateQuestionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { addQuestion } = useStore();
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState<"none" | "standard" | "news">("none");

  const similar = useMemo(
    () => findSimilarQuestions(draft, seedQuestions, 5),
    [draft]
  );

  useEffect(() => {
    if (!open) {
      setDraft("");
      setGenerating("none");
    }
  }, [open]);

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

  const canGenerate = draft.trim().length >= 8 && generating === "none";

  const handleGenerate = async (fromNews: boolean) => {
    if (!canGenerate) return;
    setGenerating(fromNews ? "news" : "standard");
    await new Promise((r) => setTimeout(r, fromNews ? 900 : 600));
    const created = addQuestion({ title: draft.trim(), fromNews });
    onClose();
    navigate(`/q/${created.id}`);
  };

  return createPortal(
    <div className="cq-overlay" onMouseDown={onClose}>
      <div
        className="cq-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create a question"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="cq-head">
          <div>
            <h2 className="cq-title">Create a Question</h2>
            <p className="cq-subtitle">Enter your question and we&apos;ll help you format it properly</p>
          </div>
          <button type="button" className="cq-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="cq-body">
          <input
            type="text"
            className="cq-input"
            placeholder="When will the conflict in Iran end?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && canGenerate) handleGenerate(false);
            }}
          />

          {draft.trim().length >= 3 && (
            <div className="cq-similar">
              <span className="cq-similar-label">or view questions similar to this…</span>
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

          <div className="cq-actions">
            <button
              type="button"
              className="cq-btn primary"
              disabled={!canGenerate}
              onClick={() => handleGenerate(false)}
            >
              {generating === "standard" ? (
                <span className="cq-spinner" aria-hidden="true" />
              ) : (
                <IconSparkle />
              )}
              {generating === "standard" ? "Generating…" : "Generate"}
            </button>

            <div className="cq-or">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="cq-btn secondary"
              disabled={!canGenerate}
              onClick={() => handleGenerate(true)}
            >
              {generating === "news" ? (
                <span className="cq-spinner dark" aria-hidden="true" />
              ) : (
                <IconNews />
              )}
              {generating === "news" ? "Pulling sources…" : "Generate from News Articles"}
            </button>
          </div>
        </div>
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
