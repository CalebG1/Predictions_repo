import { useState, type ReactNode } from "react";
import type { ForecastObject, ForecastQuestion, ProbabilityPoint } from "../domain/types";
import type { ForecastReasoning, ReasoningView } from "../domain/reasoning";
import CyberQuestionInsights from "./CyberQuestionInsights";
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
  question,
  forecast,
  history,
}: {
  reasoning: ForecastReasoning;
  questionId: string;
  question: ForecastQuestion;
  forecast: ForecastObject;
  history: ProbabilityPoint[];
}) {
  const [view, setView] = useState<ReasoningView>("one-line");
  const [historyOpen, setHistoryOpen] = useState(false);

  const viewIndex = VIEWS.findIndex((v) => v.id === view);

  function shiftView(dir: -1 | 1) {
    const next = (viewIndex + dir + VIEWS.length) % VIEWS.length;
    setView(VIEWS[next].id);
  }

  return (
    <section className={`forecast-reasoning${view === "one-page" ? " fr-wide" : ""}`} aria-label="Forecast reasoning">
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

          {question.category === "Security/Cyber" && <CyberQuestionInsights q={question} />}

          <div className="detail-grid fr-one-page-grid">
            <div className="detail-main">
              <div className="panel two-col">
                <div>
                  <h4 className="up">Drivers up</h4>
                  <ul>
                    {forecast.driversUp.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="down">Drivers down</h4>
                  <ul>
                    {forecast.driversDown.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="panel panel-collapse">
                <button
                  type="button"
                  className="panel-collapse-trigger"
                  aria-expanded={historyOpen}
                  onClick={() => setHistoryOpen((open) => !open)}
                >
                  <span className="panel-collapse-label">
                    <span>Forecast history</span>
                    <span className="muted">{history.length} updates</span>
                  </span>
                  <span className={`panel-collapse-chevron${historyOpen ? " open" : ""}`} aria-hidden="true" />
                </button>
                {historyOpen && (
                  <div className="panel-collapse-body">
                    <p className="muted small panel-collapse-note">Immutable once locked for resolution.</p>
                    <table className="hist-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Prob.</th>
                          <th>Source</th>
                          <th>What changed (trigger)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...history].reverse().map((h) => (
                          <tr key={h.id}>
                            <td>{h.timestamp}</td>
                            <td>{pct(h.probability)}</td>
                            <td>{h.source}</td>
                            <td>{h.updateTrigger}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <aside className="detail-side">
              <div className="panel kv">
                <h4>Horizon sensitivity</h4>
                {Object.entries(forecast.horizonSensitivity).map(([k, v]) => (
                  <div className="kv-row" key={k}>
                    <span>{k}</span>
                    <b>{pct(v)}</b>
                  </div>
                ))}
              </div>

              <div className="panel kv">
                <h4>Key uncertainties</h4>
                <ul className="tight">
                  {forecast.keyUncertainties.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
                <h4>Update triggers</h4>
                <ul className="tight">
                  {forecast.updateTriggers.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
                <h4>Alternative scenarios</h4>
                <ul className="tight">
                  {forecast.alternativeScenarios.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
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
        </>
      )}
    </section>
  );
}
