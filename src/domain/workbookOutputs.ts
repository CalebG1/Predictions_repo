export const WORKBOOK_OUTPUTS_KEY = "signal-ridge-workbook-outputs";
export const WORKBOOK_OUTPUT_BINDINGS_KEY = "signal-ridge-workbook-output-bindings";

export type WorkbookOutput = {
  id: string;
  name: string;
  workbook: string;
  sheet: string;
  cell: string;
  value: string;
  formula?: string;
  createdAt: string;
};

export type WorkbookOutputBinding = {
  id: string;
  outputId: string;
  questionId: string;
  createdAt: string;
};

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

export const loadWorkbookOutputs = () => load<WorkbookOutput>(WORKBOOK_OUTPUTS_KEY);
export const loadWorkbookOutputBindings = () => load<WorkbookOutputBinding>(WORKBOOK_OUTPUT_BINDINGS_KEY);
export const saveWorkbookOutputs = (outputs: WorkbookOutput[]) => localStorage.setItem(WORKBOOK_OUTPUTS_KEY, JSON.stringify(outputs));
export const saveWorkbookOutputBindings = (bindings: WorkbookOutputBinding[]) => localStorage.setItem(WORKBOOK_OUTPUT_BINDINGS_KEY, JSON.stringify(bindings));
