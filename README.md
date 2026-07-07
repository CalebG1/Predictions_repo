# Signal Ridge — Organizational Risk & Opportunity Forecasting Dashboard

An internal decision-intelligence dashboard built on top of a Kalshi-style
prediction-market surface. Every "market" becomes a **risk or opportunity
event** with a live, calibrated probability, a full history of how that
probability moved, and the reasoning behind each move. Prices are produced by a
multi-agent forecasting engine and are fully auditable — this is **not** a money
exchange (no wagering, balances, or payouts).

## Stack

- React 18 + TypeScript + Vite
- React Router
- Vitest (scoring + access-control tests)
- Zero charting dependencies — all charts are hand-rolled SVG

## Getting started

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # type-check + production build
npm test          # run unit tests
```

Use the **"Viewing as"** switcher under **Settings → Profile** to change role
(Risk Manager / CFO / Analyst) and watch private questions appear/disappear per
the access-control boundary.

## Domain model (`src/domain/`)

The Kalshi primitives were renamed and reshaped (and structured to lift into a
backend with migrations unchanged):

| Kalshi primitive | Forecasting primitive |
| --- | --- |
| Market | `ForecastQuestion` — a precise, resolvable risk/opportunity event |
| Contract / Outcome | `Outcome` — Yes/No, buckets, or scalar |
| Price / order book | `ProbabilityPoint[]` — probability time series + reason |
| Trade | `ForecastUpdate` — an agent/human move with rationale + evidence |
| Trader | `Forecaster` — agent or human, with track record + calibration |

- `types.ts` — full schema (questions, outcomes, history, updates, forecasters, evidence, resolutions, access grants, the standard `ForecastObject`).
- `scoring.ts` — pure math: Brier (binary + multiclass), log-odds aggregation, extremizing, calibration bins, RMS calibration error, Murphy calibration-vs-sharpness, coherence checks, Bayesian update. **Unit-tested.**
- `engine.ts` — deterministic mock of the multi-agent "dragonfly eye": each agent produces an **independent** estimate before synthesis (anti-anchoring), pooled via log-odds, extremized only when agents are diverse. Emits the Appendix-A `ForecastObject`.
- `access.ts` — hard public/private authorization boundary. **Unit-tested.**
- `seed.ts` — ~15 realistic questions across all categories (risks + opportunities, binary + scalar), forecasters, evidence sources, probability history, access grants, and a synthetic resolved set for calibration metrics.

## Views (`src/pages/`)

1. **Overview** — filterable/sortable grid of question cards (biggest movers, highest risk-weighted, resolving soon, most uncertain).
2. **Question detail** — probability-over-time chart with move annotations, the agent panel, outside/inside view, drivers up/down, uncertainties, update triggers, alternative scenarios, horizon sensitivity, evidence sources, and the immutable forecast history.
3. **Risk Matrix** — probability × impact scatter, colored by category.
4. **Calibration & Accuracy** — reliability diagram, Brier over time, RMS calibration error, calibration-vs-sharpness, and baseline comparisons (no-change / base-rate / recent-trend / external market). Built from **public questions only** so private lines never contaminate shared metrics.
5. **Decision View** — the leader's dilemma: a payoff matrix + sensitivity slider that produces a recommendation **labeled distinctly** from the forecast.
6. **Movers feed** — chronological probability changes with one-line triggers.

## What's mocked vs. real

- **Real & tested:** the domain model, the scoring/aggregation math, the calibration metrics, the private-visibility authorization boundary, and the forecast-object structure.
- **Mocked (deterministic):** the agent estimates and the data/signal connectors. In production each agent would be an LLM call with retrieval, and the connectors (Appendix C: central-bank/gov stats, market data, nowcasting, corporate demand, fast feeds, gated org-internal signals) would be wired to live sources. The interfaces are in place so those swaps don't reshape the UI.

## Guardrails

- No wagering / balances / payouts.
- No probability is shown without a path to its rationale and history.
- Private questions and their lines are visible only to granted users/roles and are excluded from public aggregates, the movers feed, and shared calibration.
- Forecast ("62%") is always separated from recommendation ("given your payoffs, act").
