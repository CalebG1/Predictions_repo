import { useEffect, useRef } from "react";
import type { NotebookCell } from "../../domain/types";

function autoSize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function NotebookCellRow({
  cell,
  index,
  disabled,
  onSourceChange,
  onRun,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  cell: NotebookCell;
  index: number;
  disabled: boolean;
  onSourceChange: (source: string) => void;
  onRun: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    autoSize(textareaRef.current);
  }, [cell.source]);

  const isCode = cell.kind === "code";

  return (
    <div className={`ctx-nb-cell${isCode ? " ctx-nb-cell-code" : " ctx-nb-cell-markdown"}`}>
      <div className="ctx-nb-cell-gutter">
        {isCode ? (
          <button
            type="button"
            className={`ctx-nb-run-btn${cell.status === "running" ? " running" : ""}`}
            onClick={onRun}
            disabled={disabled}
            aria-label={cell.status === "running" ? "Running…" : "Run cell"}
            title={cell.status === "running" ? "Running…" : "Run cell"}
          >
            {cell.status === "running" ? (
              <span className="ctx-analysis-spinner" aria-hidden />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        ) : (
          <span className="ctx-nb-md-label">Text</span>
        )}
        <span className="ctx-nb-index">[{index + 1}]</span>
      </div>

      <div className="ctx-nb-cell-main">
        <textarea
          ref={textareaRef}
          className={`ctx-nb-source${isCode ? " code" : ""}`}
          value={cell.source}
          placeholder={isCode ? "# Python" : "Notes"}
          spellCheck={false}
          rows={1}
          onChange={(e) => onSourceChange(e.target.value)}
        />

        {isCode && (cell.output || cell.error) && (
          <pre className={`ctx-nb-output${cell.status === "error" ? " error" : ""}`}>
            {cell.error ?? cell.output}
          </pre>
        )}
        {isCode && cell.status === "success" && cell.durationMs !== undefined && (
          <div className="ctx-nb-meta muted small">Ran in {Math.round(cell.durationMs)}ms</div>
        )}
      </div>

      <div className="ctx-nb-cell-actions">
        <button type="button" className="ctx-nb-icon-btn" onClick={onMoveUp} disabled={!onMoveUp} aria-label="Move cell up" title="Move up">
          ↑
        </button>
        <button type="button" className="ctx-nb-icon-btn" onClick={onMoveDown} disabled={!onMoveDown} aria-label="Move cell down" title="Move down">
          ↓
        </button>
        <button type="button" className="ctx-nb-icon-btn ctx-nb-icon-btn-danger" onClick={onRemove} aria-label="Delete cell" title="Delete cell">
          ×
        </button>
      </div>
    </div>
  );
}
