import type { ForecastObject, ForecastQuestion } from "./types";

function pct(p: number): string {
  return `${(p * 100).toFixed(0)}%`;
}

/** Deterministic mock assistant — answers from the forecast object until a live LLM is wired. */
export function answerForecastQuestion(
  prompt: string,
  forecast: ForecastObject,
  q: ForecastQuestion
): string {
  const text = prompt.toLowerCase().trim();
  if (!text) {
    return "Ask about the probability, drivers, resolution criteria, uncertainties, or what would trigger an update.";
  }

  if (/prob|likelihood|chance|percent|how likely|current estimate/.test(text)) {
    return `The current estimate is ${pct(forecast.currentProbability)}, anchored on a base rate of ${pct(forecast.priorBaseRate)}. Confidence in estimate quality is ${pct(forecast.confidenceInEstimateQuality)} — that's how sure we are about the forecast process, not the event itself.`;
  }

  if (/base rate|outside view|comparison class|anchor/.test(text)) {
    return forecast.outsideView;
  }

  if (/inside view|case.?specific|unique about/.test(text)) {
    return forecast.insideView;
  }

  if (/driver.*up|move.*up|push.*higher|increase|bullish|why.*up/.test(text)) {
    if (forecast.driversUp.length === 0) return "No upward drivers are flagged for this question.";
    return `Drivers pushing the estimate up:\n${forecast.driversUp.map((d) => `• ${d}`).join("\n")}`;
  }

  if (/driver.*down|move.*down|push.*lower|decrease|bearish|why.*down/.test(text)) {
    if (forecast.driversDown.length === 0) return "No downward drivers are flagged for this question.";
    return `Drivers pushing the estimate down:\n${forecast.driversDown.map((d) => `• ${d}`).join("\n")}`;
  }

  if (/driver|why.*move|what.*changed|move.*prob/.test(text)) {
    const up = forecast.driversUp.map((d) => `↑ ${d}`);
    const down = forecast.driversDown.map((d) => `↓ ${d}`);
    const lines = [...up, ...down];
    return lines.length
      ? `Key drivers:\n${lines.map((l) => `• ${l}`).join("\n")}`
      : "No explicit drivers are listed for this forecast.";
  }

  if (/uncertain|unknown|don't know|key risk/.test(text)) {
    if (forecast.keyUncertainties.length === 0) return "No key uncertainties are listed.";
    return `Key uncertainties:\n${forecast.keyUncertainties.map((u) => `• ${u}`).join("\n")}`;
  }

  if (/trigger|update|watch|monitor|what would change/.test(text)) {
    if (forecast.updateTriggers.length === 0) return "No update triggers are listed.";
    return `We would revise the forecast if:\n${forecast.updateTriggers.map((t) => `• ${t}`).join("\n")}`;
  }

  if (/scenario|alternative|what if/.test(text)) {
    if (forecast.alternativeScenarios.length === 0) return "No alternative scenarios are listed.";
    return `Alternative scenarios:\n${forecast.alternativeScenarios.map((s) => `• ${s}`).join("\n")}`;
  }

  if (/horizon|timeframe|3m|6m|12m|sensitivity/.test(text)) {
    const entries = Object.entries(forecast.horizonSensitivity);
    if (entries.length === 0) return "No horizon sensitivity data is available.";
    return `Horizon sensitivity:\n${entries.map(([k, v]) => `• ${k}: ${pct(v)}`).join("\n")}`;
  }

  if (/resolv|criteria|when.*decid|how.*decid|source/.test(text)) {
    return `Resolution criteria: ${q.resolutionCriteria}\n\nSource: ${q.resolutionSource}\n\nResolves: ${q.resolutionDate}`;
  }

  if (/impact|matter|stake|consequence/.test(text)) {
    return `Estimated impact if this resolves true: ${q.impactEstimate} (${q.impactLevel} severity, risk-weight ${pct(q.impactScore * forecast.currentProbability)}).`;
  }

  if (/agent|ensemble|dragonfly|synthesis|panel/.test(text)) {
    const agents = forecast.agentPanel.filter((a) => a.agent !== "synthesis" && a.agent !== "extremizer");
    const spread = agents.map((a) => a.estimate);
    const min = Math.min(...spread);
    const max = Math.max(...spread);
    return `The dragonfly panel pools ${agents.length} independent agent estimates (${pct(min)} – ${pct(max)} spread) via log-odds synthesis. Final pooled estimate before extremizing: ${pct(forecast.agentPanel.find((a) => a.agent === "synthesis")?.estimate ?? forecast.currentProbability)}.`;
  }

  if (/confiden/.test(text)) {
    return `Confidence in estimate quality is ${pct(forecast.confidenceInEstimateQuality)}. This reflects data coverage, source diversity, and agent agreement — not the probability of the event itself.`;
  }

  return `This forecast for "${q.title}" is at ${pct(forecast.currentProbability)}. I can explain the probability, drivers, resolution criteria, uncertainties, update triggers, or horizon sensitivity — what would you like to know?`;
}
