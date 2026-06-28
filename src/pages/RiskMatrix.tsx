import { useStore } from "../store";
import { ScatterMatrix, type ScatterDot } from "../components/charts";
import { categoryColors } from "../components/ui";

export default function RiskMatrix() {
  const { questions, yesOutcome } = useStore();

  const dots: ScatterDot[] = questions.map((q) => {
    const p = yesOutcome(q.id)?.currentProbability ?? q.priorBaseRate;
    return {
      x: p,
      y: q.impactScore,
      color: categoryColors[q.category],
      label: `${q.title} — ${(p * 100).toFixed(0)}% × ${q.impactLevel} impact`,
      r: 7 + q.impactScore * 6,
    };
  });

  const cats = Array.from(new Set(questions.map((q) => q.category)));

  return (
    <div className="dash-page">
      <div className="dash-head">
        <h1>Risk Matrix</h1>
        <p className="dash-sub">Probability × impact portfolio view. The shaded quadrant is high-probability, high-impact — watch these first.</p>
      </div>
      <div className="matrix-wrap">
        <div className="panel">
          <ScatterMatrix dots={dots} />
        </div>
        <div className="matrix-legend panel">
          <h4>Categories</h4>
          {cats.map((c) => (
            <div key={c} className="ml-row">
              <span className="qc-dot" style={{ background: categoryColors[c] }} />
              {c}
            </div>
          ))}
          <p className="muted small">Bubble size scales with impact. Position combines the live probability and the operationalized impact estimate.</p>
        </div>
      </div>
    </div>
  );
}
