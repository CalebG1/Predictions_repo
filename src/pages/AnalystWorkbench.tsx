import { useEffect, useRef, useState } from "react";
import { LocaleType, createUniver, mergeLocales } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { useStore } from "../store";
import { analystLibraryAssumptions } from "../domain/analystAssumptions";
import { Link } from "react-router-dom";
import "@univerjs/preset-sheets-core/lib/index.css";

type Template = "Blank" | "Pricing" | "Demand" | "Statistical";
type SidebarTab = "assumptions" | "agent" | "output";

const templateData: Record<Exclude<Template, "Blank">, { name: string; values: (string | number)[][] }> = {
  Pricing: { name: "Pricing model", values: [["Pricing model", "Aug", "Sep", "Oct", "Nov"], ["List price", 124, 124, 126, 128], ["Discount rate", 0.12, 0.12, 0.11, 0.1], ["Units sold", 820, 850, 890, 910], ["Revenue", "=B2*B4", "=C2*C4", "=D2*D4", "=E2*E4"]] },
  Demand: { name: "Demand forecast", values: [["Demand forecast", "Aug", "Sep", "Oct", "Nov"], ["Baseline demand", 1180, 1220, 1280, 1340], ["Seasonality index", 0.96, 0.99, 1.03, 1.08], ["Marketing lift", 0.04, 0.05, 0.05, 0.07], ["Forecast demand", "=B2*B3*(1+B4)", "=C2*C3*(1+C4)", "=D2*D3*(1+D4)", "=E2*E3*(1+E4)"]] },
  Statistical: { name: "Statistical analysis", values: [["Driver analysis", "Period 1", "Period 2", "Period 3", "Period 4"], ["Observed outcome", 61, 64, 66, 63], ["Model estimate", 60, 63, 65, 67], ["Residual", "=B2-B3", "=C2-C3", "=D2-D3", "=E2-E3"], ["Input signal", 48, 52, 57, 55]] },
};

export default function AnalystWorkbench() {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerAPIRef = useRef<ReturnType<typeof createUniver>["univerAPI"] | null>(null);
  const { questions, assumptionsFor, yesOutcome } = useStore();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [questionId, setQuestionId] = useState("q-geo");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentStatus, setAgentStatus] = useState("Ready to create a structured analysis from the active workbook and connected context.");
  const [workbookName, setWorkbookName] = useState("Untitled spreadsheet");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("assumptions");
  const [selectedAssumptionId, setSelectedAssumptionId] = useState(analystLibraryAssumptions[0].id);
  const [selectionLabel, setSelectionLabel] = useState("the active cell");

  const question = questions.find((item) => item.id === questionId) ?? questions[0];
  const assumptions = question ? assumptionsFor(question.id).filter((item) => !["archived", "invalidated"].includes(item.status)) : [];
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
    setAgentStatus(`${template} template opened in the spreadsheet. The workbook is fully editable with native spreadsheet controls.`);
  };

  const insertForecastAssumptions = () => {
    const api = univerAPIRef.current;
    const workbook = api?.getActiveWorkbook();
    if (!api || !workbook || !question) return;
    const sheet = workbook.getSheetByName("Assumptions") ?? workbook.create("Assumptions", 50, 4);
    const values = [["Assumption", "Confidence", "Status", "Source forecast"], ...assumptions.map((item) => [item.statement, item.confidence ?? "medium", item.status, question.title])];
    sheet.getRange(0, 0, values.length, 4).setValues(values);
    sheet.getRange("A1:D1").setFontWeight("bold");
    workbook.setActiveSheet(sheet);
    setAgentStatus(`${assumptions.length} accessible assumptions were inserted into a dedicated workbook tab with their forecast provenance.`);
  };

  const writeAssumptionLibrary = () => {
    const workbook = univerAPIRef.current?.getActiveWorkbook();
    if (!workbook) return null;
    const sheet = workbook.getSheetByName("Assumption library") ?? workbook.create("Assumption library", 50, 5);
    const values = [["ID", "Assumption", "Value", "Type", "Notes"], ...analystLibraryAssumptions.map((item) => [item.id, item.name, item.value, item.type, item.note])];
    sheet.getRange(0, 0, values.length, 5).setValues(values);
    sheet.getRange("A1:E1").setFontWeight("bold");
    return sheet;
  };

  const openAssumptionPicker = () => {
    const workbook = univerAPIRef.current?.getActiveWorkbook();
    const sheet = workbook?.getActiveSheet();
    const currentCell = sheet?.getSelection()?.getCurrentCell();
    const selectedCell = currentCell ? sheet?.getRange(currentCell.actualRow, currentCell.actualColumn) : null;
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
    setAgentStatus(`Inserted a live reference to “${selected.name}” in ${target.getA1Notation()}. Updating its library value will recalculate every linked cell.`);
  };

  const runAgent = () => {
    const api = univerAPIRef.current;
    const workbook = api?.getActiveWorkbook();
    if (!api || !workbook) return;
    const request = agentPrompt.trim() || "Review this workbook and identify the highest-leverage next analysis";
    const sheet = workbook.getSheetByName("AI analysis") ?? workbook.create("AI analysis", 40, 4);
    const values = [["Signal Ridge analyst agent", ""], ["Request", request], ["Forecast context", question?.title ?? "None selected"], ["Current probability", probability === undefined ? "Not available" : probability], ["Assumption count", assumptions.length], [], ["Suggested next steps", "1. Validate the key input assumptions\n2. Test a downside scenario\n3. Track the most material uncertainty as a forecast"]];
    sheet.getRange(0, 0, values.length, 2).setValues(values);
    sheet.getRange("A1:B1").setFontWeight("bold");
    workbook.setActiveSheet(sheet);
    setAgentPrompt("");
    setAgentStatus("Created an AI analysis tab in the workbook with the request, linked forecast context, assumptions, and next steps.");
  };

  return (
    <main className="univer-workbook-page analyst-univer-page">
      <header className="analyst-univer-header">
        <div><span>Analyst workspace</span><strong>{workbookName}</strong></div>
        <div className="analyst-univer-actions"><button onClick={() => setTemplateOpen(true)}>New from template</button><button onClick={openAssumptionPicker}>Insert assumption</button></div>
      </header>
      <div className="analyst-univer-layout">
        <div className="univer-workbook" ref={containerRef} />
        <aside className="analyst-univer-sidebar">
          <nav className="analyst-sidebar-tabs" aria-label="Analyst tools">
            <button className={sidebarTab === "assumptions" ? "active" : ""} onClick={() => setSidebarTab("assumptions")} title="Assumptions" aria-label="Assumptions"><span>ƒx</span><small>Assumptions</small></button>
            <button className={sidebarTab === "agent" ? "active" : ""} onClick={() => setSidebarTab("agent")} title="Agent" aria-label="Agent"><span>✦</span><small>Agent</small></button>
            <button className={sidebarTab === "output" ? "active" : ""} onClick={() => setSidebarTab("output")} title="Output" aria-label="Output"><span>↗</span><small>Output</small></button>
          </nav>
          <div className="analyst-sidebar-content">
            {sidebarTab === "assumptions" && <div className="univer-assumption-sidebar"><header><div><span>Assumption library</span><h2>Insert a live reference</h2><p>Reference a value in <strong>{selectionLabel}</strong>. Every linked cell recalculates when the source value changes.</p><Link to="/assumptions">View all assumptions →</Link></div></header><section className="analyst-connected-forecast"><span>Connected forecast</span><select value={questionId} onChange={(event) => setQuestionId(event.target.value)}>{questions.slice(0, 20).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><p>{probability === undefined ? "No probability available" : `${Math.round(probability * 100)}% current probability`} · {assumptions.length} accessible platform assumptions</p><button onClick={insertForecastAssumptions}>Add forecast assumptions</button></section><div className="univer-assumption-list">{analystLibraryAssumptions.map((assumption) => <label key={assumption.id} className={selectedAssumptionId === assumption.id ? "selected" : ""}><input type="radio" name="assumption" checked={selectedAssumptionId === assumption.id} onChange={() => setSelectedAssumptionId(assumption.id)} /><div><strong>{assumption.name}</strong><small>{assumption.note}</small></div><output className="univer-assumption-value">{String(assumption.value)}</output><em>{assumption.type}</em></label>)}</div><footer><button className="analyst-primary" onClick={insertSelectedAssumption}>Insert live reference</button></footer></div>}
            {sidebarTab === "agent" && <section className="analyst-univer-agent"><span>Signal Ridge agent</span><h2>Analyze this workbook</h2><p>{agentStatus}</p><form onSubmit={(event) => { event.preventDefault(); runAgent(); }}><textarea value={agentPrompt} onChange={(event) => setAgentPrompt(event.target.value)} placeholder="Ask the agent to analyze this workbook…" /><button type="submit">Create analysis</button></form></section>}
            {sidebarTab === "output" && <section className="analyst-output-placeholder"><span>Workbook output</span><h2>Results will appear here</h2><p>Charts, tables, scenario comparisons, and shareable analysis outputs will live in this panel.</p><div aria-hidden="true"><i /><i /><i /></div><small>Coming soon</small></section>}
          </div>
        </aside>
      </div>
      {templateOpen && <div className="analyst-modal-backdrop" onMouseDown={() => setTemplateOpen(false)}><section className="analyst-new-sheet-modal univer-template-modal" role="dialog" aria-modal="true" aria-label="Choose a spreadsheet template" onMouseDown={(event) => event.stopPropagation()}><header><div><span>New workbook</span><h2>Start from a template</h2><p>Each option opens as a native Univer workbook you can edit freely.</p></div><button onClick={() => setTemplateOpen(false)} aria-label="Close">×</button></header><div className="analyst-template-list">{(["Blank", "Pricing", "Demand", "Statistical"] as Template[]).map((template) => <button key={template} onClick={() => startFromTemplate(template)}><strong>{template === "Blank" ? "Blank spreadsheet" : templateData[template].name}</strong><small>{template === "Blank" ? "A clean workbook with no prefilled cells." : "Open a starter model with formulas and editable inputs."}</small><em>Open →</em></button>)}</div></section></div>}
    </main>
  );
}
