import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { LocaleType, createUniver, mergeLocales } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { useStore } from "../store";
import { analystLibraryAssumptions } from "../domain/analystAssumptions";
import { isStandardsQuestion } from "../domain/standards";
import { runForecast } from "../domain/engine";
import { Link } from "react-router-dom";
import "@univerjs/preset-sheets-core/lib/index.css";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import AnalysisPanel from "../components/context/AnalysisPanel";
import {
  loadWorkbookOutputBindings,
  loadWorkbookOutputs,
  loadWorkbookScenarios,
  saveWorkbookOutputBindings,
  saveWorkbookOutputs,
  saveWorkbookScenarios,
  type WorkbookOutput,
  type WorkbookScenario,
  type WorkbookScenarioOverride,
} from "../domain/workbookOutputs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { CodeIcon, SheetIcon } from "lucide-react";

type Template = "Blank" | "Pricing" | "Demand" | "Statistical";
type SidebarTab = "assumptions" | "forecast" | "scenarios" | "agent" | "output";
type WorkspaceMode = "spreadsheet" | "code";
type AgentMessage = { id: string; role: "assistant" | "user"; content: string };
type ForecastReferenceField =
  | "probability"
  | "confidence"
  | "title"
  | "baseRate"
  | "resolutionDate"
  | "impact"
  | "resolutionSource";

const forecastReferenceFields: {
  id: ForecastReferenceField;
  label: string;
  description: string;
}[] = [
  { id: "probability", label: "Current probability", description: "Latest event likelihood" },
  { id: "confidence", label: "Model confidence", description: "Confidence in estimate quality" },
  { id: "title", label: "Forecast title", description: "Question being forecast" },
  { id: "baseRate", label: "Prior base rate", description: "Outside-view starting point" },
  { id: "resolutionDate", label: "Resolution date", description: "When the forecast resolves" },
  { id: "impact", label: "Impact", description: "Estimated outcome magnitude" },
  { id: "resolutionSource", label: "Resolution source", description: "Source used to resolve it" },
];

const sidebarTools = [
  ["assumptions", "Assumptions", "ƒx"],
  ["forecast", "Forecast", "%"],
  ["scenarios", "Scenarios", "◫"],
  ["agent", "Agent", "✦"],
  ["output", "Output", "↗"],
] as const;

const templateData: Record<
  Exclude<Template, "Blank">,
  { name: string; values: (string | number)[][] }
> = {
  Pricing: {
    name: "Pricing model",
    values: [
      ["Pricing model", "Aug", "Sep", "Oct", "Nov"],
      ["List price", 124, 124, 126, 128],
      ["Discount rate", 0.12, 0.12, 0.11, 0.1],
      ["Units sold", 820, 850, 890, 910],
      ["Revenue", "=B2*B4", "=C2*C4", "=D2*D4", "=E2*E4"],
    ],
  },
  Demand: {
    name: "Demand forecast",
    values: [
      ["Demand forecast", "Aug", "Sep", "Oct", "Nov"],
      ["Baseline demand", 1180, 1220, 1280, 1340],
      ["Seasonality index", 0.96, 0.99, 1.03, 1.08],
      ["Marketing lift", 0.04, 0.05, 0.05, 0.07],
      ["Forecast demand", "=B2*B3*(1+B4)", "=C2*C3*(1+C4)", "=D2*D3*(1+D4)", "=E2*E3*(1+E4)"],
    ],
  },
  Statistical: {
    name: "Statistical analysis",
    values: [
      ["Driver analysis", "Period 1", "Period 2", "Period 3", "Period 4"],
      ["Observed outcome", 61, 64, 66, 63],
      ["Model estimate", 60, 63, 65, 67],
      ["Residual", "=B2-B3", "=C2-C3", "=D2-D3", "=E2-E3"],
      ["Input signal", 48, 52, 57, 55],
    ],
  },
};

export default function AnalystWorkbench() {
  const containerRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const univerAPIRef = useRef<ReturnType<typeof createUniver>["univerAPI"] | null>(null);
  const { questions, assumptionsFor, yesOutcome } = useStore();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [questionId, setQuestionId] = useState("q-geo");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentStatus, setAgentStatus] = useState(
    "Ready to create a structured analysis from the active workbook and connected context.",
  );
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I can help you reason about this workbook, its connected forecast, and key assumptions. This chat will not change your spreadsheet.",
    },
  ]);
  const [workbookName, setWorkbookName] = useState("My workspace");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("assumptions");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("spreadsheet");
  const [selectedAssumptionId, setSelectedAssumptionId] = useState(analystLibraryAssumptions[0].id);
  const [selectedForecastField, setSelectedForecastField] =
    useState<ForecastReferenceField>("probability");
  const [selectionLabel, setSelectionLabel] = useState("the active cell");
  const [outputName, setOutputName] = useState("");
  const [workbookOutputs, setWorkbookOutputs] = useState<WorkbookOutput[]>(loadWorkbookOutputs);
  const [scenarios, setScenarios] = useState<WorkbookScenario[]>(loadWorkbookScenarios);
  const [activeScenario, setActiveScenario] = useState<WorkbookScenario>({
    id: "scenario-draft",
    name: "Base case",
    workbook: "My workspace",
    questionId: "q-geo",
    createdAt: new Date().toISOString(),
    status: "draft",
    overrides: [],
    outputs: [],
  });
  const [scenarioName, setScenarioName] = useState("Base case");
  const [scenarioOverrideKind, setScenarioOverrideKind] =
    useState<WorkbookScenarioOverride["kind"]>("assumption");
  const [scenarioOverrideValue, setScenarioOverrideValue] = useState("");

  const question = questions.find((item) => item.id === questionId) ?? questions[0];
  const assumptions = question
    ? assumptionsFor(question.id).filter(
        (item) => !["archived", "invalidated"].includes(item.status),
      )
    : [];
  const probability = question ? yesOutcome(question.id)?.currentProbability : undefined;
  const forecast = question
    ? runForecast(question, probability === undefined ? undefined : { anchor: probability })
    : undefined;

  const forecastReferenceValue = (field: ForecastReferenceField) => {
    if (!forecast) return "—";
    switch (field) {
      // The live market/current outcome value is the existing forecast probability.
      // Fall back to the modeled estimate only when an outcome has not been created yet.
      case "probability":
        return probability ?? forecast.currentProbability;
      case "confidence":
        return forecast.confidenceInEstimateQuality;
      case "title":
        return forecast.question;
      case "baseRate":
        return forecast.priorBaseRate;
      case "resolutionDate":
        return forecast.resolutionDate;
      case "impact":
        return forecast.impact;
      case "resolutionSource":
        return forecast.resolutionSource;
    }
  };

  const formatForecastReferenceValue = (field: ForecastReferenceField) => {
    const value = forecastReferenceValue(field);
    return typeof value === "number" ? `${Math.round(value * 100)}%` : value;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const { univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS) },
      presets: [UniverSheetsCorePreset({ container: containerRef.current })],
    });
    univerAPIRef.current = univerAPI;
    univerAPI.createWorkbook({ name: "My workspace" });
    return () => univerAPI.dispose();
  }, []);

  const startFromTemplate = (template: Template) => {
    const api = univerAPIRef.current;
    if (!api) return;
    const active = api.getActiveWorkbook();
    if (active) api.disposeUnit(active.getId());
    if (template === "Blank") {
      api.createWorkbook({ name: "My workspace" });
      setWorkbookName("My workspace");
    } else {
      const seed = templateData[template];
      const workbook = api.createWorkbook({ name: seed.name });
      const sheet = workbook.getActiveSheet();
      sheet.getRange(0, 0, seed.values.length, seed.values[0].length).setValues(seed.values);
      sheet.getRange("A1:E1").setFontWeight("bold");
      setWorkbookName(seed.name);
    }
    setTemplateOpen(false);
    setAgentStatus(
      `${template} template opened in the spreadsheet. The workbook is fully editable with native spreadsheet controls.`,
    );
  };

  const writeAssumptionLibrary = () => {
    const workbook = univerAPIRef.current?.getActiveWorkbook();
    if (!workbook) return null;
    const sheet =
      workbook.getSheetByName("Assumption library") ?? workbook.create("Assumption library", 50, 5);
    const values = [
      ["ID", "Assumption", "Value", "Type", "Notes"],
      ...analystLibraryAssumptions.map((item) => [
        item.id,
        item.name,
        item.value,
        item.type,
        item.note,
      ]),
    ];
    sheet.getRange(0, 0, values.length, 5).setValues(values);
    sheet.getRange("A1:E1").setFontWeight("bold");
    return sheet;
  };

  const readActiveCell = () => {
    const workbook = univerAPIRef.current?.getActiveWorkbook();
    const sheet = workbook?.getActiveSheet();
    const currentCell = sheet?.getSelection()?.getCurrentCell();
    const range = currentCell
      ? sheet?.getRange(currentCell.actualRow, currentCell.actualColumn)
      : null;
    const cell = range?.getA1Notation() ?? "A1";
    const value = range?.getValue();
    const formula = range?.getFormula();
    return {
      cell,
      sheet: sheet?.getSheetName() ?? "Sheet1",
      value: value === undefined || value === null ? "(blank)" : String(value),
      formula: formula || undefined,
    };
  };

  const setSelectedCellAsOutput = () => {
    const selected = readActiveCell();
    setSelectionLabel(selected.cell);
    const name = outputName.trim() || `${workbookName} ${selected.cell} output`;
    const output: WorkbookOutput = {
      id: `workbook-output-${Date.now()}`,
      name,
      workbook: workbookName,
      cell: selected.cell,
      sheet: selected.sheet,
      value: selected.value,
      formula: selected.formula,
      createdAt: new Date().toISOString(),
    };
    setWorkbookOutputs((outputs) => {
      const next = [output, ...outputs];
      saveWorkbookOutputs(next);
      return next;
    });
    setOutputName("");
    setAgentStatus(`${name} was saved locally and is ready to reference from Forecast bindings.`);
  };
  const removeWorkbookOutput = (id: string) =>
    setWorkbookOutputs((outputs) => {
      const next = outputs.filter((output) => output.id !== id);
      saveWorkbookOutputs(next);
      saveWorkbookOutputBindings(
        loadWorkbookOutputBindings().filter((binding) => binding.outputId !== id),
      );
      return next;
    });

  const uploadSpreadsheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(csv|tsv)$/i.test(file.name)) {
      setAgentStatus(
        "Upload a CSV or TSV file. Excel import can be added when an XLSX parser is connected.",
      );
      return;
    }
    const delimiter = /\.tsv$/i.test(file.name) ? "\t" : ",";
    const rows = (await file.text())
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split(delimiter).map((cell) => cell.trim()));
    if (!rows.length) return;
    const api = univerAPIRef.current;
    if (!api) return;
    const active = api.getActiveWorkbook();
    if (active) api.disposeUnit(active.getId());
    const name = file.name.replace(/\.(csv|tsv)$/i, "");
    const workbook = api.createWorkbook({ name });
    const sheet = workbook.getActiveSheet();
    sheet.getRange(0, 0, rows.length, Math.max(...rows.map((row) => row.length))).setValues(rows);
    sheet.getRange(0, 0, 1, rows[0].length).setFontWeight("bold");
    setWorkbookName(name);
    setAgentStatus(`${file.name} opened as an editable workbook.`);
  };

  const insertSelectedAssumption = () => {
    const workbook = univerAPIRef.current?.getActiveWorkbook();
    const selected = analystLibraryAssumptions.find((item) => item.id === selectedAssumptionId);
    if (!workbook || !selected) return;
    const targetSheet = workbook.getActiveSheet();
    const currentCell = targetSheet.getSelection()?.getCurrentCell();
    const target = currentCell
      ? targetSheet.getRange(currentCell.actualRow, currentCell.actualColumn)
      : targetSheet.getRange("A1");
    writeAssumptionLibrary();
    workbook.setActiveSheet(targetSheet);
    const row = analystLibraryAssumptions.findIndex((item) => item.id === selected.id) + 2;
    target.setValue(`='Assumption library'!C${row}`);
    setAgentStatus(
      `Inserted a live reference to “${selected.name}” in ${target.getA1Notation()}. Updating its library value will recalculate every linked cell.`,
    );
  };

  const insertForecastReference = () => {
    const workbook = univerAPIRef.current?.getActiveWorkbook();
    if (!workbook || !question || !forecast) return;
    const targetSheet = workbook.getActiveSheet();
    const currentCell = targetSheet.getSelection()?.getCurrentCell();
    const target = currentCell
      ? targetSheet.getRange(currentCell.actualRow, currentCell.actualColumn)
      : targetSheet.getRange("A1");
    const sheet =
      workbook.getSheetByName("Forecast reference") ?? workbook.create("Forecast reference", 50, 5);
    const values = [
      ["Field", "Value", "Forecast"],
      ...forecastReferenceFields.map((field) => [
        field.label,
        forecastReferenceValue(field.id),
        forecast.question,
      ]),
    ];
    sheet.getRange(0, 0, values.length, 3).setValues(values);
    sheet.getRange("A1:C1").setFontWeight("bold");
    workbook.setActiveSheet(targetSheet);
    const row =
      forecastReferenceFields.findIndex((field) => field.id === selectedForecastField) + 2;
    target.setValue(`='Forecast reference'!B${row}`);
    setSelectionLabel(target.getA1Notation());
    const selected = forecastReferenceFields.find((field) => field.id === selectedForecastField);
    setAgentStatus(
      `Inserted a live ${selected?.label.toLowerCase() ?? "forecast"} reference for “${forecast.question}” in ${target.getA1Notation()}.`,
    );
  };

  const addScenarioOverride = () => {
    const cell = scenarioOverrideKind === "cell" ? readActiveCell() : null;
    const assumption = analystLibraryAssumptions.find((item) => item.id === selectedAssumptionId);
    const forecastField = forecastReferenceFields.find((item) => item.id === selectedForecastField);
    const baseline =
      scenarioOverrideKind === "assumption"
        ? String(assumption?.value ?? "")
        : scenarioOverrideKind === "forecast"
          ? String(forecastField ? forecastReferenceValue(forecastField.id) : "")
          : (cell?.value ?? "");
    const label =
      scenarioOverrideKind === "assumption"
        ? (assumption?.name ?? "Assumption")
        : scenarioOverrideKind === "forecast"
          ? (forecastField?.label ?? "Forecast field")
          : `${cell?.sheet ?? "Sheet1"}!${cell?.cell ?? "A1"}`;
    const reference =
      scenarioOverrideKind === "assumption"
        ? (assumption?.id ?? "")
        : scenarioOverrideKind === "forecast"
          ? (forecastField?.id ?? "")
          : `${cell?.sheet ?? "Sheet1"}!${cell?.cell ?? "A1"}`;
    const override: WorkbookScenarioOverride = {
      id: `scenario-override-${Date.now()}`,
      kind: scenarioOverrideKind,
      label,
      reference,
      baselineValue: baseline,
      overrideValue: scenarioOverrideValue || baseline,
    };
    setActiveScenario((scenario) => ({
      ...scenario,
      overrides: [...scenario.overrides, override],
    }));
    setScenarioOverrideValue("");
  };

  const scenarioOutputs = () => {
    const numericOverrides = activeScenario.overrides
      .map((override) => ({
        baseline: Number(override.baselineValue),
        value: Number(override.overrideValue),
      }))
      .filter(
        (override) =>
          Number.isFinite(override.baseline) &&
          Number.isFinite(override.value) &&
          override.baseline !== 0,
      );
    const factor = numericOverrides.length
      ? 1 +
        numericOverrides.reduce(
          (sum, override) =>
            sum + (override.value - override.baseline) / Math.abs(override.baseline),
          0,
        ) /
          numericOverrides.length
      : 1;
    return workbookOutputs.map((output) => {
      const baseline = Number(output.value);
      return {
        outputId: output.id,
        name: output.name,
        sheet: output.sheet,
        cell: output.cell,
        baselineValue: output.value,
        scenarioValue: Number.isFinite(baseline)
          ? String(Number((baseline * factor).toFixed(3)))
          : output.value,
        error: Number.isFinite(baseline) ? undefined : "Text or unavailable output",
      };
    });
  };

  const saveScenario = () => {
    const workbook = univerAPIRef.current?.getActiveWorkbook();
    const scenario: WorkbookScenario = {
      ...activeScenario,
      id: activeScenario.id === "scenario-draft" ? `scenario-${Date.now()}` : activeScenario.id,
      name: scenarioName.trim() || "Untitled scenario",
      workbook: workbookName,
      questionId: question?.id,
      createdAt: new Date().toISOString(),
      status: "saved",
      outputs: scenarioOutputs(),
    };
    if (workbook) {
      const sheetName = `Scenario – ${scenario.name}`.slice(0, 30);
      const sheet = workbook.getSheetByName(sheetName) ?? workbook.create(sheetName, 80, 6);
      const values = [
        ["Scenario", scenario.name, "Forecast", question?.title ?? "—"],
        ["Created", scenario.createdAt, "Status", "Saved"],
        [],
        ["Input", "Kind", "Baseline", "Override"],
        ...scenario.overrides.map((override) => [
          override.label,
          override.kind,
          override.baselineValue,
          override.overrideValue,
        ]),
        [],
        ["Output", "Sheet", "Cell", "Baseline", "Scenario"],
        ...scenario.outputs.map((output) => [
          output.name,
          output.sheet,
          output.cell,
          output.baselineValue,
          output.scenarioValue,
        ]),
      ];
      sheet.getRange(0, 0, values.length, 5).setValues(values);
      sheet.getRange("A1:D1").setFontWeight("bold");
      sheet.getRange(3, 0, 1, 4).setFontWeight("bold");
      sheet.getRange(6 + scenario.overrides.length, 0, 1, 5).setFontWeight("bold");
    }
    setScenarios((items) => {
      const next = [scenario, ...items.filter((item) => item.id !== scenario.id)];
      saveWorkbookScenarios(next);
      return next;
    });
    setActiveScenario(scenario);
    setScenarioName(scenario.name);
    setAgentStatus(
      `Saved “${scenario.name}” with ${scenario.overrides.length} overrides and ${scenario.outputs.length} outputs.`,
    );
  };

  const sendAgentMessage = () => {
    const request = agentPrompt.trim();
    if (!request) return;
    const currentProbability =
      probability === undefined
        ? "No current probability is available"
        : `${Math.round(probability * 100)}%`;
    const context = question
      ? `For “${question.title}”, the current probability is ${currentProbability} with ${assumptions.length} accessible assumptions. `
      : "No forecast is currently connected. ";
    const response = `${context}A useful next step is to identify the input that most changes your conclusion, then test a downside and upside case. I’ve kept this as chat guidance only—your workbook was not changed.`;

    setAgentMessages((messages) => [
      ...messages,
      { id: `user-${Date.now()}`, role: "user", content: request },
      { id: `assistant-${Date.now()}`, role: "assistant", content: response },
    ]);
    setAgentPrompt("");
    setAgentStatus("Agent response added to chat. The workbook has not been changed.");
  };

  return (
    <main className="flex h-[calc(100vh-64px)] min-h-162 flex-col bg-background">
      <header className="flex min-h-12 items-center justify-between gap-4 border-b border-border bg-card px-4 py-2">
        <div className="flex-col flex">
          <span>Analyst workspace</span>
          <strong>{workbookName}</strong>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTemplateOpen(true)}>New from template</Button>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            className="hidden"
            onChange={uploadSpreadsheet}
          />
          <Button variant="outline" onClick={() => uploadInputRef.current?.click()}>
            Upload
          </Button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)_56px_minmax(400px,460px)]">
        <nav className="flex min-h-0 flex-col border-r bg-card p-1" aria-label="Workspace view">
          <p className="px-2 py-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Workspace
          </p>
          <div className="grid gap-1">
            <Button
              type="button"
              variant={workspaceMode === "spreadsheet" ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setWorkspaceMode("spreadsheet")}
            >
              <span className="font-mono text-sm">
                <SheetIcon />
              </span>
              Spreadsheet
            </Button>
            <Button
              type="button"
              variant={workspaceMode === "code" ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setWorkspaceMode("code")}
            >
              <CodeIcon />
              Code workspace
            </Button>
          </div>
        </nav>
        <div
          className={`min-h-0 size-full ${workspaceMode === "spreadsheet" ? "block" : "hidden"}`}
          ref={containerRef}
        />
        {workspaceMode === "code" && (
          <section className="col-start-2 min-h-0 overflow-y-auto bg-muted/20 p-6">
            <div className="mx-auto max-w-4xl">
              <header className="mb-6">
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                  Analysis notebook
                </p>
                <h1 className="mt-1 text-2xl font-semibold">Code workspace</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Run Python analysis alongside the workbook. Imports, execution results, and
                  notebook cells stay local to this workspace.
                </p>
              </header>
              <Card className="bg-card">
                <CardContent className="p-5">
                  <AnalysisPanel
                    submitLabel="Save notebook analysis"
                    onSubmit={(data) => {
                      localStorage.setItem("signal-ridge-code-workspace", JSON.stringify(data));
                      setAgentStatus(`Saved “${data.title}” as local notebook analysis.`);
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </section>
        )}
        <nav
          className="flex min-h-0 flex-col items-center gap-2 border-l bg-card py-3"
          role="tablist"
          aria-label="Analyst tools"
        >
          {sidebarTools.map(([value, label, icon]) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={sidebarTab === value}
              aria-label={label}
              title={label}
              className={`size-10 p-0 text-base ${sidebarTab === value ? "bg-primary/10 text-primary hover:bg-primary/10" : "text-muted-foreground"}`}
              onClick={() => {
                setSidebarTab(value);
                if (value === "output") {
                  const selected = readActiveCell();
                  setSelectionLabel(selected.cell);
                }
              }}
            >
              <span aria-hidden="true">{icon}</span>
            </Button>
          ))}
        </nav>
        <aside className="flex min-h-0 flex-col border-l bg-muted/20">
          <div className="border-b bg-card p-4">
            <span className="text-sm font-semibold">
              {sidebarTools.find(([value]) => value === sidebarTab)?.[1]}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              Context and analysis for this workbook
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {sidebarTab === "assumptions" && (
              <div className="flex min-h-full flex-col gap-4">
                <header className="space-y-2">
                  <span className="text-sm font-semibold text-primary">Assumption library</span>
                  <h2 className="text-lg font-semibold">Insert a live reference</h2>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Reference a value in{" "}
                    <strong className="text-foreground">{selectionLabel}</strong>. Linked cells
                    recalculate when its source value changes.
                  </p>
                  <Link
                    className="text-sm font-medium text-primary hover:underline"
                    to="/assumptions"
                  >
                    View all assumptions →
                  </Link>
                </header>

                <div className="grid gap-2">
                  {analystLibraryAssumptions.map((assumption) => (
                    <Button
                      key={assumption.id}
                      type="button"
                      variant="outline"
                      className={`h-auto w-full items-start justify-between gap-3 p-3 text-left ${selectedAssumptionId === assumption.id ? "border-primary bg-primary/5" : "bg-card"}`}
                      aria-pressed={selectedAssumptionId === assumption.id}
                      onClick={() => setSelectedAssumptionId(assumption.id)}
                    >
                      <div className="grid min-w-0 flex-1 gap-1">
                        <strong className="truncate">{assumption.name}</strong>
                        <small className="line-clamp-2 whitespace-normal text-muted-foreground">
                          {assumption.note}
                        </small>
                        <span className="text-xs font-medium text-muted-foreground">
                          {assumption.type}
                        </span>
                      </div>
                      <output className="shrink-0 rounded-md bg-primary/10 px-2 py-1 font-mono text-sm font-semibold text-primary">
                        {String(assumption.value)}
                      </output>
                    </Button>
                  ))}
                </div>
                <footer className="sticky bottom-0 -mx-4 mt-auto border-t bg-muted/20 px-4 pt-4 pb-1">
                  <Button className="w-full" onClick={insertSelectedAssumption}>
                    Insert live reference
                  </Button>
                </footer>
              </div>
            )}
            {sidebarTab === "forecast" && (
              <section className="flex min-h-full flex-col gap-4">
                <header className="space-y-2">
                  <span className="text-sm font-semibold text-primary">Forecast reference</span>
                  <h2 className="text-lg font-semibold">Insert live forecast data</h2>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Choose a value from an existing forecast to link into{" "}
                    <strong className="text-foreground">{selectionLabel}</strong>.
                  </p>
                </header>
                <label className="grid gap-2 text-sm font-medium">
                  Connected forecast
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={question?.id ?? ""}
                    onChange={(event) => setQuestionId(event.target.value)}
                  >
                    {questions
                      .filter((item) => !isStandardsQuestion(item.id) || item.id === questionId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                  </select>
                </label>
                <Card className="bg-primary/5">
                  <CardContent className="space-y-1">
                    <p className="text-sm font-medium">
                      {question?.title ?? "No forecast selected"}
                    </p>
                    <p className="text-xs leading-4 text-muted-foreground">
                      Current probability{" "}
                      {probability === undefined
                        ? "is unavailable"
                        : `${Math.round(probability * 100)}%`}{" "}
                      · resolves {question?.resolutionDate ?? "—"}
                    </p>
                  </CardContent>
                </Card>
                <div className="grid gap-2 sm:grid-cols-2">
                  {forecastReferenceFields.map((field) => (
                    <Button
                      key={field.id}
                      type="button"
                      variant="outline"
                      className={`flex-col h-auto w-full  justify-between gap-3 p-3 text-left ${selectedForecastField === field.id ? "border-primary bg-primary/5" : "bg-card"}`}
                      aria-pressed={selectedForecastField === field.id}
                      onClick={() => setSelectedForecastField(field.id)}
                    >
                      <span className="grid min-w-0 gap-1">
                        <strong>{field.label}</strong>
                        <small className="whitespace-normal text-muted-foreground">
                          {field.description}
                        </small>
                      </span>
                      <output
                        title={formatForecastReferenceValue(field.id)}
                        className="max-w-full truncate rounded-md bg-muted px-2 py-1 text-xs text-foreground"
                      >
                        {formatForecastReferenceValue(field.id)}
                      </output>
                    </Button>
                  ))}
                </div>
                <footer className="sticky bottom-0 -mx-4 mt-auto border-t bg-muted/20 px-4 pt-4 pb-1">
                  <Button className="w-full" onClick={insertForecastReference} disabled={!forecast}>
                    Insert live forecast reference
                  </Button>
                </footer>
              </section>
            )}
            {sidebarTab === "scenarios" && (
              <section className="flex min-h-full flex-col gap-4">
                <header className="space-y-2">
                  <span className="text-sm font-semibold text-primary">Scenario planning</span>
                  <h2 className="text-lg font-semibold">Test a case without changing sources</h2>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Override linked inputs or a selected cell, compare every published output, then
                    save a reproducible workbook sheet.
                  </p>
                </header>
                <Card className="bg-card">
                  <CardContent className="grid gap-3">
                    <Input
                      value={scenarioName}
                      onChange={(event) => setScenarioName(event.target.value)}
                      placeholder="Scenario name"
                    />
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                      {(["assumption", "forecast", "cell"] as const).map((kind) => (
                        <Button
                          key={kind}
                          type="button"
                          size="sm"
                          variant={scenarioOverrideKind === kind ? "secondary" : "ghost"}
                          className="capitalize"
                          onClick={() => setScenarioOverrideKind(kind)}
                        >
                          {kind}
                        </Button>
                      ))}
                    </div>
                    <Input
                      value={scenarioOverrideValue}
                      onChange={(event) => setScenarioOverrideValue(event.target.value)}
                      placeholder="Override value (optional)"
                    />
                    <Button variant="outline" onClick={addScenarioOverride}>
                      Add override
                    </Button>
                  </CardContent>
                </Card>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Draft overrides</h3>
                    <span className="text-xs text-muted-foreground">
                      {activeScenario.overrides.length}
                    </span>
                  </div>
                  {activeScenario.overrides.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      Add an assumption, forecast field, or selected cell to start a what-if case.
                    </p>
                  ) : (
                    activeScenario.overrides.map((override) => (
                      <div
                        key={override.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{override.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {override.baselineValue} → {override.overrideValue}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setActiveScenario((scenario) => ({
                              ...scenario,
                              overrides: scenario.overrides.filter(
                                (item) => item.id !== override.id,
                              ),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Output comparison</h3>
                    <span className="text-xs text-muted-foreground">
                      {workbookOutputs.length} published
                    </span>
                  </div>
                  {workbookOutputs.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      Publish one or more output cells to compare scenarios.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border">
                      <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-2 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                        <span>Output</span>
                        <span>Base</span>
                        <span>Case</span>
                      </div>
                      {scenarioOutputs().map((output) => (
                        <div
                          key={output.outputId}
                          className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-2 border-t px-3 py-2 text-xs"
                        >
                          <span className="truncate font-medium">{output.name}</span>
                          <span>{output.baselineValue}</span>
                          <span className="font-semibold text-primary">{output.scenarioValue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <footer className="sticky bottom-0 -mx-4 mt-auto border-t bg-muted/20 px-4 pt-4 pb-1">
                  <Button className="w-full" onClick={saveScenario}>
                    Save scenario sheet
                  </Button>
                  <div className="mt-3 space-y-1">
                    {scenarios.slice(0, 3).map((scenario) => (
                      <Button
                        key={scenario.id}
                        type="button"
                        variant="ghost"
                        className="h-auto w-full justify-between px-1 py-1 text-left"
                        onClick={() => {
                          setActiveScenario({ ...scenario, status: "draft" });
                          setScenarioName(scenario.name);
                        }}
                      >
                        <span className="truncate">{scenario.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {scenario.overrides.length} inputs
                        </span>
                      </Button>
                    ))}
                  </div>
                </footer>
              </section>
            )}
            {sidebarTab === "agent" && (
              <section className="flex min-h-full flex-col gap-4">
                <header className="space-y-1">
                  <span className="text-sm font-semibold text-primary">Signal Ridge agent</span>
                  <h2 className="text-lg font-semibold">Workbook chat</h2>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Ask for help interpreting the workbook without altering it.
                  </p>
                </header>
                <div
                  className="space-y-3 rounded-xl border bg-muted/30 p-3"
                  role="log"
                  aria-live="polite"
                >
                  {agentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[92%] rounded-lg px-3 py-2 text-sm leading-5 ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-background text-foreground shadow-sm"}`}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-4 text-muted-foreground">{agentStatus}</p>
                <form
                  className="mt-auto space-y-2 border-t pt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendAgentMessage();
                  }}
                >
                  <Textarea
                    className="min-h-24"
                    value={agentPrompt}
                    onChange={(event) => setAgentPrompt(event.target.value)}
                    placeholder="Ask about the workbook, forecast, or assumptions…"
                  />
                  <Button type="submit" className="w-full" disabled={!agentPrompt.trim()}>
                    Send
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Sending a message never edits the spreadsheet.
                  </p>
                </form>
              </section>
            )}
            {sidebarTab === "output" && (
              <section className="flex min-h-full flex-col gap-4">
                <header className="space-y-2">
                  <span className="text-sm font-semibold text-primary">Workbook outputs</span>
                  <h2 className="text-lg font-semibold">Publish a cell for forecasts</h2>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Select a spreadsheet cell, then publish its current value and formula as
                    reusable context for any forecast.
                  </p>
                </header>
                <Card className="bg-card">
                  <CardContent className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Selected cell</span>
                      <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold text-foreground">
                        {selectionLabel}
                      </code>
                    </div>
                    <Input
                      value={outputName}
                      onChange={(event) => setOutputName(event.target.value)}
                      placeholder="Output name (optional)"
                    />
                    <Button onClick={setSelectedCellAsOutput}>Set cell as output</Button>
                    <p className="text-xs leading-4 text-muted-foreground">
                      The output keeps a reference to its source workbook, sheet, cell, and formula.
                    </p>
                  </CardContent>
                </Card>
                <div className="space-y-3">
                  {workbookOutputs.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-card p-5 text-center text-sm text-muted-foreground">
                      No outputs published yet. Select a result cell in the workbook to make it
                      available to forecasts.
                    </div>
                  ) : (
                    workbookOutputs.map((output) => (
                      <Card key={output.id} className="bg-card">
                        <CardContent className="grid gap-3">
                          <div>
                            <p className="font-medium">{output.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {output.sheet}!{output.cell} · Current value: {output.value}
                            </p>
                            {output.formula && (
                              <code className="mt-2 block truncate rounded bg-muted px-2 py-1 text-xs">
                                {output.formula}
                              </code>
                            )}
                          </div>
                          <div className="grid gap-2">
                            <Button
                              variant="outline"
                              onClick={() => removeWorkbookOutput(output.id)}
                            >
                              Remove output
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <span>New workbook</span>
            <DialogTitle>Start from a template</DialogTitle>
            <DialogDescription>
              Each option opens as a native Univer workbook you can edit freely.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {(["Blank", "Pricing", "Demand", "Statistical"] as Template[]).map((template) => (
              <Button
                key={template}
                variant="outline"
                className="h-auto justify-between p-4 text-left"
                onClick={() => startFromTemplate(template)}
              >
                <span className="grid gap-1">
                  <strong>
                    {template === "Blank" ? "Blank spreadsheet" : templateData[template].name}
                  </strong>
                  <small className="font-normal text-muted-foreground">
                    {template === "Blank"
                      ? "A clean workbook with no prefilled cells."
                      : "Open a starter model with formulas and editable inputs."}
                  </small>
                </span>
                <em className="not-italic text-primary">Open →</em>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
