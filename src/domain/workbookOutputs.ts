export const WORKBOOK_OUTPUTS_KEY = "signal-ridge-workbook-outputs";
export const WORKBOOK_OUTPUT_BINDINGS_KEY = "signal-ridge-workbook-output-bindings";
export const WORKBOOK_SCENARIOS_KEY = "signal-ridge-workbook-scenarios";

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

export type ScenarioOverrideKind = "assumption" | "forecast" | "cell";

export type WorkbookScenarioOverride = {
  id: string;
  kind: ScenarioOverrideKind;
  label: string;
  reference: string;
  baselineValue: string;
  overrideValue: string;
};

export type WorkbookScenarioOutput = {
  outputId: string;
  name: string;
  sheet: string;
  cell: string;
  baselineValue: string;
  scenarioValue: string;
  error?: string;
};

export type WorkbookScenario = {
  id: string;
  name: string;
  workbook: string;
  questionId?: string;
  createdAt: string;
  status: "draft" | "saved";
  overrides: WorkbookScenarioOverride[];
  outputs: WorkbookScenarioOutput[];
};

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

export const loadWorkbookOutputs = () => load<WorkbookOutput>(WORKBOOK_OUTPUTS_KEY);
export const loadWorkbookOutputBindings = () =>
  load<WorkbookOutputBinding>(WORKBOOK_OUTPUT_BINDINGS_KEY);
export const saveWorkbookOutputs = (outputs: WorkbookOutput[]) =>
  localStorage.setItem(WORKBOOK_OUTPUTS_KEY, JSON.stringify(outputs));
export const saveWorkbookOutputBindings = (bindings: WorkbookOutputBinding[]) =>
  localStorage.setItem(WORKBOOK_OUTPUT_BINDINGS_KEY, JSON.stringify(bindings));
export const loadWorkbookScenarios = () => load<WorkbookScenario>(WORKBOOK_SCENARIOS_KEY);
export const saveWorkbookScenarios = (scenarios: WorkbookScenario[]) =>
  localStorage.setItem(WORKBOOK_SCENARIOS_KEY, JSON.stringify(scenarios));
