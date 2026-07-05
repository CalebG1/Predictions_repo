import type { ForecastQuestion } from "./types";

export function questionUrl(id: string): string {
  return `${window.location.origin}/q/${id}`;
}

export function embedUrl(id: string): string {
  return `${window.location.origin}/embed/q/${id}`;
}

export function shareMessage(q: ForecastQuestion, probability: number): string {
  return `${q.title} — ${(probability * 100).toFixed(0)}% · resolves ${q.resolutionDate}`;
}

export function embedCode(id: string, title: string): string {
  const url = embedUrl(id);
  return `<iframe src="${url}" width="360" height="200" style="border:1px solid #e5e7eb;border-radius:12px" title="${title.replace(/"/g, "&quot;")}"></iframe>`;
}

export function teamsShareUrl(q: ForecastQuestion, probability: number): string {
  const url = questionUrl(q.id);
  const text = shareMessage(q, probability);
  return `https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&msgText=${encodeURIComponent(text)}`;
}

export function slackShareText(q: ForecastQuestion, probability: number): string {
  const url = questionUrl(q.id);
  return `${shareMessage(q, probability)}\n${url}`;
}

export function emailShareUrl(q: ForecastQuestion, probability: number): string {
  const subject = encodeURIComponent(`Forecast: ${q.title}`);
  const body = encodeURIComponent(`${shareMessage(q, probability)}\n\nView forecast: ${questionUrl(q.id)}`);
  return `mailto:?subject=${subject}&body=${body}`;
}
