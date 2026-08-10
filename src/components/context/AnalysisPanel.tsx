import { useEffect, useRef, useState } from "react";
import { newId, renderNotebookAsText } from "../../domain/context";
import type { NotebookCell, Visibility } from "../../domain/types";
import { importNotebookFile } from "../../lib/notebookImport";
import {
  ensureSandbox,
  restartSandbox,
  runInSandbox,
  sandboxRuntimeLabel,
} from "../../lib/pyodideSandbox";
import { visibilityOrder } from "../ui";
import NotebookCellRow from "./NotebookCellRow";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

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
      prev.map((c) =>
        c.kind === "code" ? { ...c, status: "idle", output: undefined, error: undefined } : c,
      ),
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
    <div className="space-y-4">
      <div className="space-y-4">
        <div
          className={`flex items-center gap-2 text-sm ${phase === "error" ? "text-destructive" : phase === "ready" ? "text-emerald-700" : "text-muted-foreground"}`}
        >
          {phase === "loading" && (
            <span
              className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden
            />
          )}
          <span className="size-2 rounded-full bg-current" aria-hidden />
          <span>{statusText}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".ipynb,.py"
            hidden
            onChange={(e) => handleImport(e.target.files)}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => addCell("code")}>
            + Code cell
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addCell("markdown")}>
            + Text cell
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={runAll}
            disabled={phase !== "ready"}
          >
            Run all
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="ml-auto"
            onClick={handleRestart}
            disabled={phase === "loading"}
          >
            Restart kernel
          </Button>
        </div>

        <div className="space-y-2">
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

      <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <label className="grid gap-1.5 text-sm font-medium">
          <span>Title</span>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sensitivity check on base-rate assumptions"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          <span>Visibility</span>
          <Select value={visibility} onValueChange={(value) => setVisibility(value as Visibility)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibilityOrder.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
