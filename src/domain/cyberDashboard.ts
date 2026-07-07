import type { ForecastQuestion } from "./types";

/** Visible open Security/Cyber forecast questions. */
export function cyberQuestions(questions: ForecastQuestion[]): ForecastQuestion[] {
  return questions.filter((q) => q.category === "Security/Cyber" && q.status === "open");
}
