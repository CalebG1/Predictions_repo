import { useEffect, useRef, useState } from "react";
import { newId, renderNotebookAsText } from "../../domain/context";
import type { NotebookCell, Visibility } from "../../domain/types";
import { importNotebookFile } from "../../lib/notebookImport";
import { ensureSandbox, restartSandbox, runInSandbox, sandboxRuntimeLabel } from "../../lib/pyodideSandbox";
import { visibilityOrder } from "../ui";
import NotebookCellRow from "./NotebookCellRow";

const STARTER_CODE = `import statistics

samples = [0.41, 0.44, 0.47, 0.52, 0.49]
print("mean   :", round(statistics.mean(samples), 3))
print("stdev  :", round(statistics.stdev(samples), 3))
`;

type Phase = "idle" | "loading" | "ready" | "error";

function makeCell(kind: NotebookCell["kind"], source = ""): NotebookCell {
  return { id: newId("cell"), kind, source, status: "idle" };
}

export default function AnalysisPanel({
  onSubmit,
  submitLabel = "Add analysis to library",
}: {
  onSubmit: (data: {
    title: string;
    body: string;
    visibility: Visibility;
    notebookCells: NotebookCell[];
    runtime: string;
  }) => void;
  submitLabel?: string;
}) {
  const [cells, setCells] = useState<NotebookCell[]>(() => [makeCell("code", STARTER_CODE)]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("Loading…");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("team");
  const bootedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    setPhase("loading");
    ensureSandbox((s) => setStatusText(s))
      .then(() => {
        setPhase("ready");
        setStatusText("Ready");
      })
      .catch((err) => {
        setPhase("error");
        setStatusText(err instanceof Error ? err.message : "Failed to start");
      });
  }, []);

  const updateCell = (id: string, patch: Partial<NotebookCell>) => {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const runCell = async (id: string) => {
    const cell = cells.find((c) => c.id === id);
    if (!cell || cell.kind !== "code" || phase !== "ready") return;
    setPhase("loading");
    updateCell(id, { status: "running", error: undefined });
    const result = await runInSandbox(cell.source, (s) => setStatusText(s));
    updateCell(id, {
      status: result.ok ? "success" : "error",
      output: result.ok ? result.output : undefined,
      error: result.ok ? undefined : result.error,
      durationMs: result.durationMs,
    });
    setPhase("ready");
    setStatusText("Ready");
  };

  const runAll = async () => {
    for (const cell of cells) {
      if (cell.kind === "code") {
        await runCell(cell.id);
      }
    }
  };

  const addCell = (kind: NotebookCell["kind"]) => {
    setCells((prev) => [...prev, makeCell(kind)]);
  };

  const removeCell = (id: string) => {
    setCells((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  const moveCell = (id: string, dir: -1 | 1) => {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };

  const handleRestart = async () => {
    setPhase("loading");
    setStatusText("Restarting…");
    await restartSandbox();
    setCells((prev) =>
      prev.map((c) => (c.kind === "code" ? { ...c, status: "idle", output: undefined, error: undefined } : c))
    );
    setPhase("ready");
    setStatusText("Ready");
  };

  const hasRunOutput = cells.some((c) => c.kind === "code" && c.status === "success");
  const canSubmit = title.trim().length > 0 && hasRunOutput;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      body: renderNotebookAsText(cells),
      visibility,
      notebookCells: cells,
      runtime: sandboxRuntimeLabel(),
    });
  };

  const handleImport = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    try {
      const { cells: imported, title: importedTitle } = await importNotebookFile(file);
      setCells(imported);
      setTitle(importedTitle);
      setStatusText(`Imported ${file.name}`);
      window.setTimeout(() => setStatusText("Ready"), 2000);
    } catch (err) {
      setStatusText(err instanceof Error ? err.message : "Import failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="ctx-analysis">
      <div className="ctx-analysis-scroll">
        <div className={`ctx-analysis-status ctx-analysis-status-${phase}`}>
          {phase === "loading" && <span className="ctx-analysis-spinner" aria-hidden />}
          <span className="ctx-analysis-status-dot" aria-hidden />
          <span>{statusText}</span>
        </div>

        <div className="ctx-analysis-toolbar">
          <button type="button" className="ctx-secondary-btn" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ipynb,.py"
            hidden
            onChange={(e) => handleImport(e.target.files)}
          />
          <button type="button" className="ctx-secondary-btn" onClick={() => addCell("code")}>
            + Code cell
          </button>
          <button type="button" className="ctx-secondary-btn" onClick={() => addCell("markdown")}>
            + Text cell
          </button>
          <button type="button" className="ctx-secondary-btn" onClick={runAll} disabled={phase !== "ready"}>
            Run all
          </button>
          <button type="button" className="ctx-link-btn ctx-analysis-restart" onClick={handleRestart} disabled={phase === "loading"}>
            Restart kernel
          </button>
        </div>

        <div className="ctx-nb">
          {cells.map((cell, idx) => (
            <NotebookCellRow
              key={cell.id}
              index={idx}
              cell={cell}
              disabled={phase !== "ready"}
              onSourceChange={(source) => updateCell(cell.id, { source })}
              onRun={() => runCell(cell.id)}
              onRemove={() => removeCell(cell.id)}
              onMoveUp={idx > 0 ? () => moveCell(cell.id, -1) : undefined}
              onMoveDown={idx < cells.length - 1 ? () => moveCell(cell.id, 1) : undefined}
            />
          ))}
        </div>
      </div>

      <div className="ctx-analysis-footer">
        <label className="ctx-field">
          <span className="ctx-field-label">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sensitivity check on base-rate assumptions"
          />
        </label>
        <label className="ctx-field">
          <span className="ctx-field-label">Visibility</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            {visibilityOrder.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ctx-primary-btn" disabled={!canSubmit} onClick={handleSubmit}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
