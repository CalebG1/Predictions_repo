import type { CreateQuestionInput } from "./generateQuestion";

export const FORECAST_PROCESSING_MS = 10 * 60 * 1000;

export interface ForecastJob {
  id: string;
  questionId: string;
  title: string;
  startedAt: number;
  durationMs: number;
  input: CreateQuestionInput;
  complete: boolean;
}
