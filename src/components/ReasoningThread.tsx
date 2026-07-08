import { useEffect, useState, type ReactNode } from "react";
import { formatModelContextPreview } from "../domain/context";
import type { ForecastReasoning, ReasoningView } from "../domain/reasoning";
import { useStore } from "../store";
import { IconClock, IconDocument, IconExternalLink, IconLayers, IconRefresh } from "./icons";
import { pct } from "./ui";

const VIEWS: { id: ReasoningView; label: string }[] = [
  { id: "one-line", label: "One line" },
  { id: "summary", label: "Summary" },
  { id: "one-page", label: "One page" },
];

function AccordionSection({
  icon,
  title,
  meta,
  children,
}: {
  icon: ReactNode;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`fr-accordion${open ? " open" : ""}`}>
      <button
        type="button"
        className="fr-accordion-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="fr-accordion-icon">{icon}</span>
        <span className="fr-accordion-title">{title}</span>
        {meta && <span className="fr-accordion-meta">{meta}</span>}
        <span className={`fr-accordion-chevron${open ? " open" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="fr-accordion-body">{children}</div>}
    </div>
  );
}

export default function ReasoningThread({
  reasoning,
  questionId,
}: {
  reasoning: ForecastReasoning;
  questionId: string;
}) {
  const { manualContextForQuestion, saveManualContextForQuestion, assembleModelContext } = useStore();
  const [view, setView] = useState<ReasoningView>("one-line");
  const [refreshFreq, setRefreshFreq] = useState("daily");
  const [refreshUntil, setRefreshUntil] = useState("2026-12-05");
  const [extraContext, setExtraContext] = useState(() => manualContextForQuestion(questionId));
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setExtraContext(manualContextForQuestion(questionId));
  }, [questionId, manualContextForQuestion]);

  const viewIndex = VIEWS.findIndex((v) => v.id === view);

  function shiftView(dir: -1 | 1) {
    const next = (viewIndex + dir + VIEWS.length) % VIEWS.length;
    setView(VIEWS[next].id);
  }

  return (
    <section className="forecast-reasoning" aria-label="Forecast reasoning">
      <div className="fr-view-nav">
        <button type="button" className="fr-view-arrow" aria-label="Previous view" onClick={() => shiftView(-1)}>
          ‹
        </button>
        <div className="fr-view-tabs" role="tablist" aria-label="Reasoning view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              className={`fr-view-tab${view === v.id ? " active" : ""}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button type="button" className="fr-view-arrow" aria-label="Next view" onClick={() => shiftView(1)}>
          ›
        </button>
      </div>

      {view === "one-page" ? (
        <div className="fr-one-page">
          <ul className="fr-bullets">
            {reasoning.summaryBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          <h3 className="fr-section-label">Key figures</h3>
          <div className="fr-table-wrap">
            <table className="fr-table">
              <thead>
                <tr>
                  <th>Figure/Metric</th>
                  <th>Value</th>
                  <th>Source</th>
                  <th>Significance</th>
                </tr>
              </thead>
              <tbody>
                {reasoning.keyFigures.map((row) => (
                  <tr key={row.metric}>
                    <td>{row.metric}</td>
                    <td>{row.value}</td>
                    <td>{row.source}</td>
                    <td>{row.significance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="fr-section-label">Historical context</h3>
          <ul className="fr-bullets">
            {reasoning.historicalContext.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p className="fr-one-liner">{reasoning.oneLine}</p>

          {view === "summary" && (
            <ul className="fr-bullets fr-summary-bullets">
              {reasoning.summaryBullets.slice(1, 4).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}

          <div className="fr-refresh-box">
            <div className="fr-refresh-head">
              <IconDocument />
              <span>Latest refresh triggered by {reasoning.latestRefresh.trigger}</span>
            </div>
            <ul className="fr-refresh-list">
              <li>
                {reasoning.latestRefresh.url ? (
                  <a href={reasoning.latestRefresh.url} target="_blank" rel="noopener noreferrer">
                    {reasoning.latestRefresh.headline}
                    <IconExternalLink />
                  </a>
                ) : (
                  reasoning.latestRefresh.headline
                )}
              </li>
            </ul>
            <p className="fr-refresh-note">{reasoning.latestRefresh.explanation}</p>
          </div>

          <div className="fr-accordions">
            <AccordionSection icon={<IconRefresh />} title="Changes from previous forecast">
              <ul className="fr-plain-list">
                {reasoning.changesFromPrevious.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </AccordionSection>

            <AccordionSection
              icon={<IconDocument />}
              title="News sources"
              meta={`${reasoning.newsSources.length} references`}
            >
              <ul className="fr-link-list">
                {reasoning.newsSources.map((src) => (
                  <li key={src.title}>
                    {src.url ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer">
                        {src.title}
                        <IconExternalLink />
                      </a>
                    ) : (
                      src.title
                    )}
                  </li>
                ))}
              </ul>
            </AccordionSection>

            <AccordionSection
              icon={<IconClock />}
              title="Historical precedents"
              meta={`${reasoning.historicalPrecedents.length} precedents`}
            >
              <ul className="fr-precedent-list">
                {reasoning.historicalPrecedents.map((p) => (
                  <li key={p.title}>
                    <strong>{p.title}</strong>
                    <span>{p.description}</span>
                  </li>
                ))}
              </ul>
            </AccordionSection>

            <AccordionSection
              icon={<IconLayers />}
              title="Prediction trace"
              meta={`${reasoning.predictionTrace.length} attempts`}
            >
              <ul className="fr-trace-list">
                {reasoning.predictionTrace.map((attempt) => (
                  <li key={attempt.label}>
                    <div className="fr-trace-head">
                      <span>{attempt.label}</span>
                      <b>{pct(attempt.probability)}</b>
                    </div>
                    <p>{attempt.summary}</p>
                  </li>
                ))}
              </ul>
            </AccordionSection>
          </div>

          <p className="fr-chat-hint">For more information, use the forecast chat.</p>

          <div className="fr-config">
            <div className="fr-config-row">
              <label className="fr-config-label" htmlFor="fr-refresh-freq">
                Refresh frequency:
              </label>
              <select
                id="fr-refresh-freq"
                className="fr-config-select"
                value={refreshFreq}
                onChange={(e) => setRefreshFreq(e.target.value)}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <span className="fr-config-until-label">until</span>
              <input
                type="date"
                className="fr-config-date"
                value={refreshUntil}
                onChange={(e) => setRefreshUntil(e.target.value)}
              />
              <button type="button" className="fr-config-clear" onClick={() => setRefreshUntil("")}>
                Clear date
              </button>
            </div>

            <div className="fr-context-block">
              <div className="fr-context-head">
                <span className="fr-config-label">Additional context (optional):</span>
                <button
                  type="button"
                  className="fr-context-preview"
                  onClick={() => setPreviewOpen((v) => !v)}
                >
                  {previewOpen ? "Hide preview" : "Preview"}
                </button>
              </div>
              <textarea
                className="fr-context-input"
                rows={4}
                placeholder="Provide any additional information that should inform this forecast (e.g., private knowledge, specific assumptions, constraints)..."
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                onBlur={() => saveManualContextForQuestion(questionId, extraContext)}
              />
              {previewOpen && (
                <pre className="ctx-preview-pre">{formatModelContextPreview(assembleModelContext(questionId))}</pre>
              )}
              <p className="muted small">Saved to the org context library on blur. Versioned for audit.</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
