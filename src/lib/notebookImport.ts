import { newId } from "../domain/context";
import type { NotebookCell } from "../domain/types";

type IpynbCell = {
  cell_type?: string;
  source?: string | string[];
  outputs?: IpynbOutput[];
};

type IpynbOutput = {
  output_type?: string;
  name?: string;
  text?: string | string[];
  data?: Record<string, string | string[]>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
};

type IpynbFile = {
  cells?: IpynbCell[];
  metadata?: {
    title?: string;
  };
};

function joinSource(source: string | string[] | undefined): string {
  if (!source) return "";
  return Array.isArray(source) ? source.join("") : source;
}

function joinText(text: string | string[] | undefined): string {
  if (!text) return "";
  return Array.isArray(text) ? text.join("") : text;
}

function outputFromIpynb(outputs: IpynbOutput[] | undefined): { output?: string; error?: string } {
  if (!outputs?.length) return {};

  const chunks: string[] = [];
  let error: string | undefined;

  for (const out of outputs) {
    if (out.output_type === "stream") {
      const text = joinText(out.text).trimEnd();
      if (text) chunks.push(text);
      continue;
    }
    if (out.output_type === "execute_result" || out.output_type === "display_data") {
      const plain = out.data?.["text/plain"];
      const text = joinText(plain).trimEnd();
      if (text) chunks.push(text);
      continue;
    }
    if (out.output_type === "error") {
      const trace = out.traceback?.length
        ? joinText(out.traceback)
        : `${out.ename ?? "Error"}: ${out.evalue ?? ""}`;
      error = trace.trim();
    }
  }

  return {
    output: chunks.length ? chunks.join("\n") : undefined,
    error,
  };
}

function cellFromIpynb(cell: IpynbCell): NotebookCell | null {
  const source = joinSource(cell.source).trimEnd();
  if (cell.cell_type === "markdown" || cell.cell_type === "raw") {
    if (!source) return null;
    return { id: newId("cell"), kind: "markdown", source, status: "idle" };
  }
  if (cell.cell_type === "code") {
    const { output, error } = outputFromIpynb(cell.outputs);
    const hasResult = !!(output || error);
    if (!source && !hasResult) return null;
    return {
      id: newId("cell"),
      kind: "code",
      source,
      output,
      error,
      status: hasResult ? (error ? "error" : "success") : "idle",
    };
  }
  return null;
}

export function parseIpynbJson(text: string): NotebookCell[] {
  const data = JSON.parse(text) as IpynbFile;
  if (!Array.isArray(data.cells)) {
    throw new Error("Notebook has no cells.");
  }
  const cells = data.cells.map(cellFromIpynb).filter((c): c is NotebookCell => c !== null);
  if (cells.length === 0) {
    throw new Error("Notebook has no supported cells.");
  }
  return cells;
}

export function parsePythonFile(text: string): NotebookCell[] {
  const source = text.replace(/\r\n/g, "\n").trimEnd();
  return [{ id: newId("cell"), kind: "code", source, status: "idle" }];
}

export function titleFromFilename(name: string): string {
  const base = name.replace(/\.(ipynb|py)$/i, "").trim();
  return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

export async function importNotebookFile(file: File): Promise<{ cells: NotebookCell[]; title: string }> {
  const text = await file.text();
  const lower = file.name.toLowerCase();

  let cells: NotebookCell[];
  if (lower.endsWith(".ipynb")) {
    cells = parseIpynbJson(text);
  } else if (lower.endsWith(".py")) {
    cells = parsePythonFile(text);
  } else {
    throw new Error("Unsupported file type. Use .ipynb or .py.");
  }

  return { cells, title: titleFromFilename(file.name) };
}
