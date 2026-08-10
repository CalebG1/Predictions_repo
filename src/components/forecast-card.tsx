// Shared Kalshi-style forecast card and compact mover row, used by the
// Competitors and Standards tabs. Cards navigate to the shared question
// detail page; the footer link goes wherever the owning entity lives.

import { Link, useNavigate } from "react-router-dom";
import type { ForecastQuestion } from "../domain/types";
import { pct, signedPct } from "./ui";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { CompetitorAvatar } from "./competitors";

/** Any company-like entity that owns a forecast (competitor, standards company). */
export interface ForecastCardEntity {
  name: string;
  monogram: string;
  color: string;
}

export function ForecastCard({
  question,
  probability,
  delta7,
  entity,
  chipLabel,
  badge,
  horizonText,
  footerTo,
  footerLabel,
}: {
  question: ForecastQuestion;
  probability: number;
  delta7: number | null;
  entity: ForecastCardEntity;
  /** Small category chip next to the avatar (move category, commitment theme, ...). */
  chipLabel: string;
  /** Optional highlighted pill (e.g. "New", "Universal"). */
  badge?: string;
  /** Human-readable expected window shown above the probability bar. */
  horizonText: string;
  footerTo: string;
  footerLabel: string;
}) {
  const navigate = useNavigate();
  const delta = delta7 ?? 0;
  const barWidth = Math.max(4, Math.round(probability * 100));

  return (
    <Card
      className="cursor-pointer text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/q/${question.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/q/${question.id}`);
        }
      }}
    >
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CompetitorAvatar competitor={entity} />
          <span>{chipLabel}</span>
          {badge && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{badge}</span>
          )}
        </div>

        <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-5">
          {question.title}
        </h3>

        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block text-xs text-muted-foreground">{horizonText}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
          <span
            className={`text-xs font-semibold ${delta >= 0 ? "text-emerald-600" : "text-destructive"}`}
          >
            {signedPct(delta7)}% 7d
          </span>
          <Button
            type="button"
            size="sm"
            className="font-bold"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/q/${question.id}`);
            }}
          >
            {pct(probability)}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
          <span>Resolves {question.resolutionDate}</span>
          <Link
            to={footerTo}
            className="font-medium text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {footerLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Compact sidebar row ("Top movers" / "Most likely") linking to the forecast. */
export function MoverRow({
  question,
  probability,
  delta7,
  subtitle,
}: {
  question: ForecastQuestion;
  probability: number;
  delta7: number | null;
  subtitle: string;
}) {
  const delta = delta7 ?? 0;
  const up = delta >= 0;
  return (
    <Link
      to={`/q/${question.id}`}
      className="flex items-center justify-between gap-3 py-3 first:pt-0 hover:text-primary"
    >
      <div className="min-w-0">
        <span className="block truncate text-sm font-medium">{question.title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="shrink-0 text-right">
        <span className="block text-sm font-semibold">{pct(probability)}</span>
        <span className={`text-xs font-semibold ${up ? "text-emerald-600" : "text-destructive"}`}>
          {up ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}
        </span>
      </div>
    </Link>
  );
}
