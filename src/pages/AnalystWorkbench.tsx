import { useEffect, useRef, useState } from "react";
import { LocaleType, createUniver, mergeLocales } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { useStore } from "../store";
import { analystLibraryAssumptions } from "../domain/analystAssumptions";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import "@univerjs/preset-sheets-core/lib/index.css";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

type Template = "Blank" | "Pricing" | "Demand" | "Statistical";
type SidebarTab = "assumptions" | "agent" | "output";

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
  const univerAPIRef = useRef<ReturnType<typeof createUniver>["univerAPI"] | null>(null);
  const { questions, assumptionsFor, yesOutcome } = useStore();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [questionId, setQuestionId] = useState("q-geo");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentStatus, setAgentStatus] = useState(
    "Ready to create a structured analysis from the active workbook and connected context.",
  );
  const [workbookName, setWorkbookName] = useState("Untitled spreadsheet");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("assumptions");
  const [selectedAssumptionId, setSelectedAssumptionId] = useState(analystLibraryAssumptions[0].id);
  const [selectionLabel, setSelectionLabel] = useState("the active cell");

  const question = questions.find((item) => item.id === questionId) ?? questions[0];
  const assumptions = question
    ? assumptionsFor(question.id).filter(
        (item) => !["archived", "invalidated"].includes(item.status),
      )
    : [];
  const probability = question ? yesOutcome(question.id)?.currentProbability : undefined;

  useEffect(() => {
    if (!containerRef.current) return;
    const { univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS) },
      presets: [UniverSheetsCorePreset({ container: containerRef.current })],
    });
    univerAPIRef.current = univerAPI;
    univerAPI.createWorkbook({ name: "Untitled spreadsheet" });
    return () => univerAPI.dispose();
  }, []);

  const startFromTemplate = (template: Template) => {
    const api = univerAPIRef.current;
    if (!api) return;
    const active = api.getActiveWorkbook();
    if (active) api.disposeUnit(active.getId());
    if (template === "Blank") {
      api.createWorkbook({ name: "Untitled spreadsheet" });
      setWorkbookName("Untitled spreadsheet");
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

  const insertForecastAssumptions = () => {
    const api = univerAPIRef.current;
    const workbook = api?.getActiveWorkbook();
    if (!api || !workbook || !question) return;
    const sheet = workbook.getSheetByName("Assumptions") ?? workbook.create("Assumptions", 50, 4);
    const values = [
      ["Assumption", "Confidence", "Status", "Source forecast"],
      ...assumptions.map((item) => [
        item.statement,
        item.confidence ?? "medium",
        item.status,
        question.title,
      ]),
    ];
    sheet.getRange(0, 0, values.length, 4).setValues(values);
    sheet.getRange("A1:D1").setFontWeight("bold");
    workbook.setActiveSheet(sheet);
    setAgentStatus(
      `${assumptions.length} accessible assumptions were inserted into a dedicated workbook tab with their forecast provenance.`,
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

  const openAssumptionPicker = () => {
    const workbook = univerAPIRef.current?.getActiveWorkbook();
    const sheet = workbook?.getActiveSheet();
    const currentCell = sheet?.getSelection()?.getCurrentCell();
    const selectedCell = currentCell
      ? sheet?.getRange(currentCell.actualRow, currentCell.actualColumn)
      : null;
    setSelectionLabel(selectedCell?.getA1Notation() ?? "A1");
    setSidebarTab("assumptions");
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

  const runAgent = () => {
    const api = univerAPIRef.current;
    const workbook = api?.getActiveWorkbook();
    if (!api || !workbook) return;
    const request =
      agentPrompt.trim() || "Review this workbook and identify the highest-leverage next analysis";
    const sheet = workbook.getSheetByName("AI analysis") ?? workbook.create("AI analysis", 40, 4);
    const values = [
      ["Signal Ridge analyst agent", ""],
      ["Request", request],
      ["Forecast context", question?.title ?? "None selected"],
      ["Current probability", probability === undefined ? "Not available" : probability],
      ["Assumption count", assumptions.length],
      [],
      [
        "Suggested next steps",
        "1. Validate the key input assumptions\n2. Test a downside scenario\n3. Track the most material uncertainty as a forecast",
      ],
    ];
    sheet.getRange(0, 0, values.length, 2).setValues(values);
    sheet.getRange("A1:B1").setFontWeight("bold");
    workbook.setActiveSheet(sheet);
    setAgentPrompt("");
    setAgentStatus(
      "Created an AI analysis tab in the workbook with the request, linked forecast context, assumptions, and next steps.",
    );
  };

  return (
    <main className="flex h-[calc(100vh-94px)] min-h-162 flex-col bg-background">
      <header className="flex min-h-12 items-center justify-between gap-4 border-b border-border bg-card px-4 py-2">
        <div className="flex-col flex">
          <span>Analyst workspace</span>
          <strong>{workbookName}</strong>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTemplateOpen(true)}>New from template</Button>
          <Button variant="outline" onClick={openAssumptionPicker}>
            Insert assumption
          </Button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-h-0 size-full" ref={containerRef} />
        <aside className="flex min-h-0 flex-col border-l bg-card">
          <Tabs
            value={sidebarTab}
            onValueChange={(value) => setSidebarTab(value as SidebarTab)}
            className="contents"
          >
            <TabsList
              className="grid h-auto grid-cols-3 rounded-none border-b bg-muted/30 p-1"
              aria-label="Analyst tools"
            >
              <TabsTrigger value="assumptions" title="Assumptions" aria-label="Assumptions">
                <span>ƒx</span>
                <small>Assumptions</small>
              </TabsTrigger>
              <TabsTrigger value="agent" title="Agent" aria-label="Agent">
                <span>✦</span>
                <small>Agent</small>
              </TabsTrigger>
              <TabsTrigger value="output" title="Output" aria-label="Output">
                <span>↗</span>
                <small>Output</small>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {sidebarTab === "assumptions" && (
              <div className="flex min-h-full flex-col">
                <header className="space-y-1">
                  <div>
                    <span className="text-sm font-semibold text-primary">Assumption library</span>
                    <h2 className="text-xl font-semibold">Insert a live reference</h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Reference a value in <strong>{selectionLabel}</strong>. Every linked cell
                      recalculates when the source value changes.
                    </p>
                    <Link
                      className="text-sm font-medium text-primary hover:underline"
                      to="/assumptions"
                    >
                      View all assumptions →
                    </Link>
                  </div>
                </header>
                <section className="mt-5 grid gap-3 rounded-lg border bg-muted/30 p-4">
                  <span className="text-sm font-semibold">Connected forecast</span>
                  <Select
                    value={questionId}
                    onValueChange={(value) => value && setQuestionId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {questions.slice(0, 20).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {probability === undefined
                      ? "No probability available"
                      : `${Math.round(probability * 100)}% current probability`}{" "}
                    · {assumptions.length} accessible platform assumptions
                  </p>
                  <Button size="sm" onClick={insertForecastAssumptions}>
                    Add forecast assumptions
                  </Button>
                </section>
                <div className="mt-3 grid gap-2">
                  {analystLibraryAssumptions.map((assumption) => (
                    <Button
                      key={assumption.id}
                      type="button"
                      variant="outline"
                      className={`h-auto w-full items-start justify-between gap-3 p-3 text-left ${selectedAssumptionId === assumption.id ? "border-primary bg-primary/5" : ""}`}
                      aria-pressed={selectedAssumptionId === assumption.id}
                      onClick={() => setSelectedAssumptionId(assumption.id)}
                    >
                      <div className="grid min-w-0 gap-1">
                        <strong className="truncate">{assumption.name}</strong>
                        <small className="text-muted-foreground">{assumption.note}</small>
                      </div>
                      <output className="shrink-0 font-mono text-sm font-semibold text-primary">
                        {String(assumption.value)}
                      </output>
                      <em className="shrink-0 text-xs not-italic text-muted-foreground">
                        {assumption.type}
                      </em>
                    </Button>
                  ))}
                </div>
                <footer className="mt-4 border-t pt-4">
                  <Button onClick={insertSelectedAssumption}>Insert live reference</Button>
                </footer>
              </div>
            )}
            {sidebarTab === "agent" && (
              <section className="space-y-3">
                <span className="text-sm font-semibold text-primary">Signal Ridge agent</span>
                <h2 className="text-xl font-semibold">Analyze this workbook</h2>
                <p className="text-sm text-muted-foreground">{agentStatus}</p>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    runAgent();
                  }}
                >
                  <Textarea
                    value={agentPrompt}
                    onChange={(event) => setAgentPrompt(event.target.value)}
                    placeholder="Ask the agent to analyze this workbook…"
                  />
                  <Button type="submit">Create analysis</Button>
                </form>
              </section>
            )}
            {sidebarTab === "output" && (
              <section className="rounded-lg border border-dashed p-5 text-center">
                <span className="text-sm font-semibold text-primary">Workbook output</span>
                <h2 className="mt-1 text-xl font-semibold">Results will appear here</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Charts, tables, scenario comparisons, and shareable analysis outputs will live in
                  this panel.
                </p>
                <div
                  className="mx-auto mt-5 grid max-w-xs grid-cols-3 items-end gap-2"
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                </div>
                <small className="mt-4 block text-muted-foreground">Coming soon</small>
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
