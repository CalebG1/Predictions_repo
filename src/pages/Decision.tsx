import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { pct } from "../components/ui";

export default function Decision() {
  const { questions, yesOutcome } = useStore();
  const [sp] = useSearchParams();
  const preselect = sp.get("q") ?? questions[0]?.id;
  const [qid, setQid] = useState(preselect);

  const q = questions.find((x) => x.id === qid) ?? questions[0];
  const basP = q ? yesOutcome(q.id)?.currentProbability ?? q.priorBaseRate : 0.5;

  const [p, setP] = useState(basP);
  const [actYes, setActYes] = useState(80);
  const [actNo, setActNo] = useState(-20);
  const [inactYes, setInactYes] = useState(-100);
  const [inactNo, setInactNo] = useState(10);

  // keep slider in sync when question changes
  const evalResult = useMemo(() => {
    const evAction = p * actYes + (1 - p) * actNo;
    const evInaction = p * inactYes + (1 - p) * inactNo;
    return { evAction, evInaction, recommend: evAction >= evInaction ? "Act" : "Hold" };
  }, [p, actYes, actNo, inactYes, inactNo]);

  if (!q) return <div className="dash-page">No questions available.</div>;

  return (
    <div className="dash-page">
      <div className="dash-head">
        <h1>Decision View</h1>
        <p className="dash-sub">
          The leader's dilemma: the <b>forecast</b> (probability) is kept separate from the <b>recommendation</b>
          (action given your payoffs). Enter your utility/payoff matrix below.
        </p>
      </div>

      <div className="panel">
        <div className="decision-controls">
          <label>
            Question
            <select value={qid} onChange={(e) => { setQid(e.target.value); const nq = questions.find((x)=>x.id===e.target.value); setP(nq ? yesOutcome(nq.id)?.currentProbability ?? nq.priorBaseRate : 0.5); }}>
              {questions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="decision-prob">
          <div className="dp-badge forecast">
            Forecast probability
            <b>{pct(p)}</b>
          </div>
          <input
            type="range"
            min={2}
            max={98}
            value={Math.round(p * 100)}
            onChange={(e) => setP(Number(e.target.value) / 100)}
          />
          <span className="muted small">Sensitivity slider — sweep the probability to test how robust the recommendation is.</span>
        </div>

        <div className="payoff-matrix">
          <div />
          <div className="pm-head">If event occurs</div>
          <div className="pm-head">If it doesn't</div>
          <div className="pm-label">Act now</div>
          <input type="number" value={actYes} onChange={(e) => setActYes(Number(e.target.value))} />
          <input type="number" value={actNo} onChange={(e) => setActNo(Number(e.target.value))} />
          <div className="pm-label">Hold</div>
          <input type="number" value={inactYes} onChange={(e) => setInactYes(Number(e.target.value))} />
          <input type="number" value={inactNo} onChange={(e) => setInactNo(Number(e.target.value))} />
        </div>

        <div className="decision-result">
          <div className="dr-ev">
            <span>EV(Act)</span>
            <b className={evalResult.evAction >= evalResult.evInaction ? "up" : ""}>{evalResult.evAction.toFixed(1)}</b>
          </div>
          <div className="dr-ev">
            <span>EV(Hold)</span>
            <b className={evalResult.evInaction > evalResult.evAction ? "up" : ""}>{evalResult.evInaction.toFixed(1)}</b>
          </div>
          <div className={`dr-rec ${evalResult.recommend === "Act" ? "act" : "hold"}`}>
            <span className="advocacy-tag">Recommendation (advocacy mode)</span>
            {evalResult.recommend === "Act" ? "Act now" : "Hold"}
          </div>
        </div>
        <p className="muted small">
          This recommendation is labeled distinctly from the forecast. Changing the payoff matrix never changes the
          probability — only the decision that the probability implies.
        </p>
      </div>
    </div>
  );
}
