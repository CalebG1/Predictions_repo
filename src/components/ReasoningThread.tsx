import { useState, type ReactNode } from "react";
import type { ForecastObject, ForecastQuestion, ProbabilityPoint } from "../domain/types";
import type { ForecastReasoning, ReasoningView } from "../domain/reasoning";
import CyberQuestionInsights from "./CyberQuestionInsights";
import { IconClock, IconDocument, IconExternalLink, IconLayers, IconRefresh } from "./icons";
import { pct } from "./ui";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent } from "./ui/card";

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
    <div className="rounded-lg border">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-start gap-3 rounded-b-none px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-medium">{title}</span>
        {meta && <span className="ml-auto text-xs text-muted-foreground">{meta}</span>}
        <span
          className={`text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </Button>
      {open && <div className="border-t p-4">{children}</div>}
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
    <section className="space-y-5" aria-label="Forecast reasoning">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous view"
          onClick={() => shiftView(-1)}
        >
          ‹
        </Button>
        <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label="Reasoning view">
          {VIEWS.map((v) => (
            <Button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              variant="ghost"
              size="sm"
              className={view === v.id ? "bg-background shadow-sm" : ""}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next view"
          onClick={() => shiftView(1)}
        >
          ›
        </Button>
      </div>

      {view === "one-page" ? (
        <div className="space-y-5">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {reasoning.summaryBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Key figures
          </h3>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Figure/Metric</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Significance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reasoning.keyFigures.map((row) => (
                  <TableRow key={row.metric}>
                    <TableCell>{row.metric}</TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell>{row.significance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historical context
          </h3>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {reasoning.historicalContext.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {question.category === "Security/Cyber" && <CyberQuestionInsights q={question} />}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <Card className="border bg-card two-col">
                <CardContent>
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
                </CardContent>
              </Card>

              <Card className="border bg-card">
                <CardContent>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex h-auto w-full items-center justify-between gap-3 p-0 text-left"
                    aria-expanded={historyOpen}
                    onClick={() => setHistoryOpen((open) => !open)}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span>Forecast history</span>
                      <span className="text-muted-foreground">{history.length} updates</span>
                    </span>
                    <span
                      className={`text-muted-foreground transition-transform ${historyOpen ? "rotate-90" : ""}`}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </Button>
                  {historyOpen && (
                    <div className="mt-4 border-t pt-4">
                      <p className="mb-3 text-xs text-muted-foreground">
                        Immutable once locked for resolution.
                      </p>
                      <Table className="">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Prob.</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>What changed (trigger)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...history].reverse().map((h) => (
                            <TableRow key={h.id}>
                              <TableCell>{h.timestamp}</TableCell>
                              <TableCell>{pct(h.probability)}</TableCell>
                              <TableCell>{h.source}</TableCell>
                              <TableCell>{h.updateTrigger}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-30 lg:self-start">
              <Card className="border bg-card kv">
                <CardContent>
                  <h4>Horizon sensitivity</h4>
                  {Object.entries(forecast.horizonSensitivity).map(([k, v]) => (
                    <div className="" key={k}>
                      <span>{k}</span>
                      <b>{pct(v)}</b>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border bg-card kv">
                <CardContent>
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
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      ) : (
        <>
          <p className="text-lg font-medium leading-relaxed">{reasoning.oneLine}</p>

          {view === "summary" && (
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
              {reasoning.summaryBullets.slice(1, 4).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconDocument />
              <span>Latest refresh triggered by {reasoning.latestRefresh.trigger}</span>
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm">
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
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {reasoning.latestRefresh.explanation}
            </p>
          </div>

          <div className="space-y-2">
            <AccordionSection icon={<IconRefresh />} title="Changes from previous forecast">
              <ul className="list-disc space-y-2 pl-5 text-sm">
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
              <ul className="space-y-2 text-sm [&_a]:inline-flex [&_a]:items-center [&_a]:gap-1 [&_a]:text-primary [&_a]:hover:underline">
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
              <ul className="space-y-3 text-sm">
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
              <ul className="space-y-3 text-sm">
                {reasoning.predictionTrace.map((attempt) => (
                  <li key={attempt.label}>
                    <div className="flex items-center justify-between gap-3 font-medium">
                      <span>{attempt.label}</span>
                      <b>{pct(attempt.probability)}</b>
                    </div>
                    <p>{attempt.summary}</p>
                  </li>
                ))}
              </ul>
            </AccordionSection>
          </div>

          <p className="text-sm text-muted-foreground">
            For more information, use the forecast chat.
          </p>
        </>
      )}
    </section>
  );
}
