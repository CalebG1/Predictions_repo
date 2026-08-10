import { brierOverTime, calibrationCurve, calibrationData } from "../../domain/seed";
import { meanBrier, rmsCalibrationError, calibrationVsSharpness } from "../../domain/scoring";
import { MiniBars, ReliabilityDiagram } from "../../components/charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Card, CardContent } from "../../components/ui/card";

export default function Methodology() {
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
    <>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Methodology</h2>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
          How forecasts are scored and validated. Proper scoring rules apply once questions resolve;
          private lines are excluded from org-wide metrics.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold tabular-nums">{brier.toFixed(3)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Brier score (lower better)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold tabular-nums">{(rmsce * 100).toFixed(1)}%</div>
            <div className="mt-1 text-xs text-muted-foreground">RMS calibration error</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold tabular-nums">{resolution.toFixed(3)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Resolution / sharpness (higher better)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold tabular-nums">{reliability.toFixed(3)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Reliability term (lower better)
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <span>Reliability diagram</span>
              <span className="text-muted-foreground">
                predicted vs observed by bucket · n={calibrationData.length}
              </span>
            </div>
            <ReliabilityDiagram bins={calibrationCurve} />
            <p className="text-muted-foreground small">
              Points below the diagonal = overconfident; above = underconfident. Bubble size =
              sample count in the bucket. Uncertainty (base-rate variance): {uncertainty.toFixed(3)}
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <span>Brier score over time</span>
              <span className="text-muted-foreground">trailing 12 months</span>
            </div>
            <MiniBars data={brierOverTime} />

            <h4 style={{ marginTop: 18 }}>Baseline comparison</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forecaster / baseline</TableHead>
                  <TableHead>Brier</TableHead>
                  <TableHead>vs model</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baselines.map((b) => (
                  <TableRow key={b.name}>
                    <TableCell>{b.name}</TableCell>
                    <TableCell>{b.brier.toFixed(3)}</TableCell>
                    <TableCell
                      className={b.brier <= brier ? "text-emerald-700" : "text-destructive"}
                    >
                      {b.name === "Model (engine)"
                        ? "—"
                        : `${b.brier <= brier ? "" : "+"}${(b.brier - b.brier).toFixed(3)}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
