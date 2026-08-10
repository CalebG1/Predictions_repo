import { useEffect, useRef } from "react";
import type { NotebookCell } from "../../domain/types";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Play } from "lucide-react";

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
    <div className={`flex gap-3 rounded-lg border p-3 ${isCode ? "bg-card" : "bg-muted/30"}`}>
      <div className="flex w-10 shrink-0 flex-col items-center gap-2 text-xs text-muted-foreground">
        {isCode ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-7"
            onClick={onRun}
            disabled={disabled}
            aria-label={cell.status === "running" ? "Running…" : "Run cell"}
            title={cell.status === "running" ? "Running…" : "Run cell"}
          >
            {cell.status === "running" ? (
              <span
                className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden
              />
            ) : (
              <Play className="size-3 fill-current" />
            )}
          </Button>
        ) : (
          <span className="rounded bg-muted px-1 py-0.5 font-medium">Text</span>
        )}
        <span>[{index + 1}]</span>
      </div>

      <div className="min-w-0 flex-1">
        <Textarea
          ref={textareaRef}
          className={isCode ? "min-h-20 resize-y font-mono text-xs" : "min-h-16 resize-y"}
          value={cell.source}
          placeholder={isCode ? "# Python" : "Notes"}
          spellCheck={false}
          rows={1}
          onChange={(e) => onSourceChange(e.target.value)}
        />

        {isCode && (cell.output || cell.error) && (
          <pre
            className={`mt-2 overflow-x-auto rounded-md border p-3 text-xs ${cell.status === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-muted"}`}
          >
            {cell.error ?? cell.output}
          </pre>
        )}
        {isCode && cell.status === "success" && cell.durationMs !== undefined && (
          <div className="mt-1 text-xs text-muted-foreground">
            Ran in {Math.round(cell.durationMs)}ms
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onMoveUp}
          disabled={!onMoveUp}
          aria-label="Move cell up"
          title="Move up"
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onMoveDown}
          disabled={!onMoveDown}
          aria-label="Move cell down"
          title="Move down"
        >
          ↓
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label="Delete cell"
          title="Delete cell"
        >
          ×
        </Button>
      </div>
    </div>
  );
}
