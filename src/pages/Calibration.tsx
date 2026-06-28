import { brierOverTime, calibrationCurve, calibrationData } from "../domain/seed";
import { meanBrier, rmsCalibrationError, calibrationVsSharpness } from "../domain/scoring";
import { MiniBars, ReliabilityDiagram } from "../components/charts";

export default function Calibration() {
  const brier = meanBrier(calibrationData);
  const rmsce = rmsCalibrationError(calibrationCurve);
  const { reliability, resolution, uncertainty } = calibrationVsSharpness(calibrationData);

  const baselines = [
    { name: "Model (engine)", brier: brier },
    { name: "No-change", brier: 0.244 },
    { name: "Base-rate", brier: 0.231 },
    { name: "Recent-trend", brier: 0.218 },
    { name: "External market", brier: 0.142 },
  ];

  return (
    <div className="dash-page">
      <div className="dash-head">
        <h1>Calibration &amp; Accuracy</h1>
        <p className="dash-sub">
          The trust layer. Forecasts are scored with proper scoring rules and only count once questions resolve. Private
          lines are excluded from these org-wide metrics.
        </p>
      </div>

      <div className="metric-row">
        <div className="metric">
          <div className="metric-num">{brier.toFixed(3)}</div>
          <div className="metric-lbl">Brier score (lower better)</div>
        </div>
        <div className="metric">
          <div className="metric-num">{(rmsce * 100).toFixed(1)}%</div>
          <div className="metric-lbl">RMS calibration error</div>
        </div>
        <div className="metric">
          <div className="metric-num">{resolution.toFixed(3)}</div>
          <div className="metric-lbl">Resolution / sharpness (higher better)</div>
        </div>
        <div className="metric">
          <div className="metric-num">{reliability.toFixed(3)}</div>
          <div className="metric-lbl">Reliability term (lower better)</div>
        </div>
      </div>

      <div className="calib-grid">
        <div className="panel">
          <div className="panel-head">
            <span>Reliability diagram</span>
            <span className="muted">predicted vs observed by bucket · n={calibrationData.length}</span>
          </div>
          <ReliabilityDiagram bins={calibrationCurve} />
          <p className="muted small">
            Points below the diagonal = overconfident; above = underconfident. Bubble size = sample count in the bucket.
            Uncertainty (base-rate variance): {uncertainty.toFixed(3)}.
          </p>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span>Brier score over time</span>
            <span className="muted">trailing 12 months</span>
          </div>
          <MiniBars data={brierOverTime} />

          <h4 style={{ marginTop: 18 }}>Baseline comparison</h4>
          <table className="hist-table">
            <thead>
              <tr>
                <th>Forecaster / baseline</th>
                <th>Brier</th>
                <th>vs model</th>
              </tr>
            </thead>
            <tbody>
              {baselines.map((b) => (
                <tr key={b.name}>
                  <td>{b.name}</td>
                  <td>{b.brier.toFixed(3)}</td>
                  <td className={b.brier <= brier ? "down" : "up"}>
                    {b.name === "Model (engine)" ? "—" : `${b.brier <= brier ? "" : "+"}${(brier - b.brier).toFixed(3)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
