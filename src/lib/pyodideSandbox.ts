/** In-browser Python sandbox via Pyodide (WebAssembly). */

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (msg: string) => void }) => void;
  setStderr: (options: { batched: (msg: string) => void }) => void;
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

export type SandboxPhase = "idle" | "loading" | "ready" | "error";

export interface SandboxRunResult {
  ok: boolean;
  output: string;
  error?: string;
  durationMs: number;
}

let instance: PyodideInterface | null = null;
let loadPromise: Promise<PyodideInterface> | null = null;
let taskQueue: Promise<unknown> = Promise.resolve();

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load the Pyodide runtime script.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load the Pyodide runtime script."));
    document.head.appendChild(script);
  });
}

export function sandboxRuntimeLabel(): string {
  return `Python 3.12`;
}

/** Fetches and boots the WASM Python runtime. Safe to call repeatedly; loads once. */
export function ensureSandbox(onStatus?: (status: string) => void): Promise<PyodideInterface> {
  if (instance) return Promise.resolve(instance);
  if (!loadPromise) {
    loadPromise = (async () => {
      onStatus?.("Loading…");
      await loadScriptOnce(`${PYODIDE_INDEX_URL}pyodide.js`);
      if (typeof window.loadPyodide !== "function") {
        throw new Error("Pyodide script loaded but did not attach loadPyodide() to window.");
      }
      onStatus?.("Starting…");
      const pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
      instance = pyodide;
      onStatus?.("ready");
      return pyodide;
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

function stringifyResult(value: unknown): string {
  if (value === undefined || value === null) return "";
  try {
    return String(value);
  } catch {
    return "";
  }
}

/** Runs one snippet to completion. Calls are queued so cells never interleave stdout. */
export function runInSandbox(code: string, onStatus?: (status: string) => void): Promise<SandboxRunResult> {
  const run = async (): Promise<SandboxRunResult> => {
    const started = performance.now();
    try {
      const pyodide = await ensureSandbox(onStatus);
      let output = "";
      pyodide.setStdout({
        batched: (msg) => {
          output += (output ? "\n" : "") + msg;
        },
      });
      pyodide.setStderr({
        batched: (msg) => {
          output += (output ? "\n" : "") + msg;
        },
      });
      const result = await pyodide.runPythonAsync(code);
      const repr = stringifyResult(result);
      if (repr) output += (output ? "\n" : "") + repr;
      return { ok: true, output, durationMs: performance.now() - started };
    } catch (err) {
      return {
        ok: false,
        output: "",
        error: err instanceof Error ? err.message : String(err),
        durationMs: performance.now() - started,
      };
    }
  };

  const result = taskQueue.then(run, run);
  taskQueue = result.catch(() => undefined);
  return result;
}

/** Simulates a "restart kernel" by clearing user-defined globals, without re-downloading the runtime. */
export async function restartSandbox(): Promise<void> {
  if (!instance) return;
  await runInSandbox(
    "for _n in list(globals().keys()):\n    if not _n.startswith('_'):\n        del globals()[_n]\n"
  );
}
