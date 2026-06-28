import type { AgentEstimate } from "../domain/types";
import { pct } from "./ui";

export default function AgentPanel({ panel }: { panel: AgentEstimate[] }) {
  const estimating = panel.filter((a) => a.agent !== "synthesis" && a.agent !== "extremizer");
  const synthesis = panel.find((a) => a.agent === "synthesis");
  const extremizer = panel.find((a) => a.agent === "extremizer");
  const min = Math.min(...estimating.map((a) => a.estimate));
  const max = Math.max(...estimating.map((a) => a.estimate));

  return (
    <div className="agent-panel">
      <div className="ap-note">
        Each agent's estimate is recorded <b>independently</b>, before seeing the others (anti-anchoring). The
        synthesis pools them with log-odds averaging.
      </div>
      {estimating.map((a) => (
        <div key={a.agent} className="ap-row">
          <span className="ap-name">{a.agent}</span>
          <div className="ap-bar">
            <div className="ap-bar-track">
              <div className="ap-bar-fill" style={{ left: `${a.estimate * 100}%` }} title={pct(a.estimate)} />
            </div>
          </div>
          <span className="ap-val">{pct(a.estimate)}</span>
        </div>
      ))}
      <div className="ap-spread">
        Independent spread: <b>{pct(min)}</b> – <b>{pct(max)}</b>
      </div>
      <div className="ap-synth">
        {synthesis && (
          <div className="ap-synth-row">
            <span>Synthesis (log-odds pool)</span>
            <b>{pct(synthesis.estimate)}</b>
          </div>
        )}
        {extremizer && (
          <div className="ap-synth-row">
            <span>{extremizer.rationale}</span>
            <b>{pct(extremizer.estimate)}</b>
          </div>
        )}
      </div>
    </div>
  );
}
