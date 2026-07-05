import { CONNECTORS } from "../../domain/connectors";
import { evidenceSources } from "../../domain/seed";
import { TOUCHPOINT_CATALOG } from "../../domain/touchpoints";

const WORKFLOW = [
  {
    step: "Outside view",
    summary: "Anchor on comparison-class base rates before looking at this case.",
    detail:
      "Every forecast starts from a reference class — historical frequency, market-implied odds, or a published benchmark. This is the outside view: what usually happens in situations like this.",
  },
  {
    step: "Inside view",
    summary: "Adjust for case-specific causal forces, incentives, and constraints.",
    detail:
      "The inside view weighs what is unique about this question — actors, timing, mitigations, and org-specific context. It should move the probability away from the base rate only when there is diagnostic evidence.",
  },
  {
    step: "Bayesian updating",
    summary: "Move incrementally as new signals arrive; record what changed.",
    detail:
      "Weak evidence nudges the estimate; strong, primary-source evidence can move it sharply. Every update is logged with a trigger so the forecast history stays auditable.",
  },
];

const INSIDE_VIEW_AGENT = {
  role: "inside-view",
  weight: 1.0,
  label: "Case-specific causal forces and incentives.",
};

export default function Context() {
  const builtInConnectors = CONNECTORS.filter((c) => c.kind);
  const evidenceClasses = [...new Set(evidenceSources.map((e) => e.sourceClass.replace("_", " ")))];

  return (
    <>
      <div className="settings-section-head">
        <h2>Context</h2>
        <p className="dash-sub">
          How case-specific context feeds forecasts. The outside view anchors on base rates; the inside view adjusts
          for what is unique about each question. Both appear on every question detail page.
        </p>
      </div>

      <div className="panel context-flow">
        <div className="panel-head">
          <span>Forecasting workflow</span>
          <span className="muted">outside view → inside view → Bayesian updating</span>
        </div>
        <div className="context-steps">
          {WORKFLOW.map((item, i) => (
            <div key={item.step} className="context-step">
              <div className="context-step-num">{i + 1}</div>
              <div>
                <h4>{item.step}</h4>
                <p className="context-step-summary">{item.summary}</p>
                <p className="muted small">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="context-grid">
        <div className="panel">
          <div className="panel-head">
            <span>In the question view</span>
          </div>
          <p className="muted small">
            The sidebar panel <b>Outside vs inside view</b> shows the anchor base rate, a one-line outside-view
            comparison, and the inside-view case definition. Drivers up/down, key uncertainties, and update triggers
            all derive from this split.
          </p>
          <div className="context-preview">
            <div className="context-preview-label">Outside vs inside view</div>
            <div className="kv-row">
              <span>Base rate</span>
              <b>25%</b>
            </div>
            <p className="muted small">Comparison class historical frequency ≈ 25%.</p>
            <p className="muted small">
              A top-5 component supplier halts shipments for &gt;14 consecutive days before 2026-12-31.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span>Inside-view agent</span>
            <span className="muted">dragonfly panel</span>
          </div>
          <p className="muted small">
            The <b>{INSIDE_VIEW_AGENT.role}</b> agent records an independent estimate before seeing peers
            (anti-anchoring). It is weighted at {INSIDE_VIEW_AGENT.weight.toFixed(1)}× in the log-odds synthesis.
          </p>
          <div className="context-agent">
            <span className="ap-name">{INSIDE_VIEW_AGENT.role}</span>
            <span className="muted small">{INSIDE_VIEW_AGENT.label}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Context sources</span>
          <span className="muted">touchpoints that feed the inside view</span>
        </div>
        <p className="muted small">
          Signals from interviews, spreadsheets, chat channels, and surveys appear on question cards when relevant.
          Use the <b>+</b> button on a card to connect more context. Icons only show when there is active signal data.
        </p>
        <table className="hist-table">
          <thead>
            <tr>
              <th>Source type</th>
              <th>What it pulls</th>
              <th>Built-in connector</th>
            </tr>
          </thead>
          <tbody>
            {TOUCHPOINT_CATALOG.map((t) => {
              const connector = builtInConnectors.find((c) => c.kind === t.kind);
              return (
                <tr key={t.kind}>
                  <td>{t.label}</td>
                  <td className="muted">{t.description}</td>
                  <td>{connector?.name ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Evidence classes</span>
          <span className="muted">Appendix C signal layers</span>
        </div>
        <p className="muted small">
          Retrieved evidence is tagged by source class and credibility. Disconfirming sources are deliberately fetched
          to stress-test the lead view.
        </p>
        <div className="context-tags">
          {evidenceClasses.map((c) => (
            <span key={c} className="context-tag">
              {c}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
