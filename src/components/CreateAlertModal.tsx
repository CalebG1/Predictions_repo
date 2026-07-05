import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ForecastQuestion } from "../domain/types";
import { useStore } from "../store";
import { pct } from "./ui";

export default function CreateAlertModal({
  open,
  q,
  probability,
  onClose,
}: {
  open: boolean;
  q: ForecastQuestion;
  probability: number;
  onClose: () => void;
}) {
  const { yesOutcome, addAlert } = useStore();
  const yes = yesOutcome(q.id);

  const [direction, setDirection] = useState<"above" | "below">("above");
  const [thresholdPct, setThresholdPct] = useState(Math.round(probability * 100));

  useEffect(() => {
    if (!open) return;
    setDirection("above");
    setThresholdPct(Math.round(probability * 100));
  }, [open, probability]);

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

  if (!open || !yes) return null;

  const threshold = Math.min(100, Math.max(1, thresholdPct)) / 100;

  const handleCreate = () => {
    addAlert({
      questionId: q.id,
      outcomeId: yes.id,
      direction,
      threshold,
    });
    onClose();
  };

  return createPortal(
    <div className="alert-overlay" onMouseDown={onClose}>
      <div
        className="alert-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Set probability alert"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="alert-head">
          <div>
            <h2 className="alert-title">Set alert</h2>
          </div>
          <button type="button" className="alert-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="alert-body">
          <div className="alert-question">
            <span className="alert-q-label">Question</span>
            <span className="alert-q-title">{q.title}</span>
          </div>

          <div className="alert-current">
            <span className="alert-q-label">Current probability</span>
            <span className="alert-current-val">{pct(probability)}</span>
          </div>

          <div className="alert-direction">
            <span className="alert-q-label">Notify me when probability</span>
            <button
              type="button"
              className={`alert-dir-opt${direction === "above" ? " active" : ""}`}
              onClick={() => setDirection("above")}
            >
              <span className="alert-dir-icon up">▲</span>
              <span>Rises above</span>
            </button>
            <button
              type="button"
              className={`alert-dir-opt${direction === "below" ? " active" : ""}`}
              onClick={() => setDirection("below")}
            >
              <span className="alert-dir-icon down">▼</span>
              <span>Falls below</span>
            </button>
          </div>

          <div className="alert-threshold">
            <label className="alert-q-label" htmlFor="alert-threshold-input">
              Threshold
            </label>
            <div className="alert-threshold-row">
              <input
                id="alert-threshold-range"
                type="range"
                min={1}
                max={99}
                value={thresholdPct}
                onChange={(e) => setThresholdPct(Number(e.target.value))}
                className="alert-range"
              />
              <div className="alert-threshold-input-wrap">
                <input
                  id="alert-threshold-input"
                  type="number"
                  min={1}
                  max={99}
                  value={thresholdPct}
                  onChange={(e) => setThresholdPct(Number(e.target.value))}
                  className="alert-threshold-input"
                />
                <span className="alert-pct-suffix">%</span>
              </div>
            </div>
            <p className="alert-preview">
              Alert when probability {direction === "above" ? "rises to or above" : "falls to or below"}{" "}
              <strong>{pct(threshold)}</strong>
            </p>
          </div>
        </div>

        <footer className="alert-foot">
          <button type="button" className="alert-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="alert-btn primary" onClick={handleCreate}>
            Create alert
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
