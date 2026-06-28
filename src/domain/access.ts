// Hard authorization boundary for public vs. private questions.
// Private lines must never leak into public aggregates, feeds, or shared
// calibration views.

import type { AccessGrant, ForecastQuestion, User } from "./types";

export function canViewQuestion(
  user: User,
  question: ForecastQuestion,
  grants: AccessGrant[]
): boolean {
  if (question.visibility === "public") return true;
  // Admins can administer but we still treat private as need-to-know:
  // an explicit grant (by user id or role) is required.
  return grants.some(
    (g) =>
      g.questionId === question.id &&
      ((g.userId && g.userId === user.id) || (g.role && g.role === user.role))
  );
}

/** Filter a list of questions to only those the user is authorized to see. */
export function visibleQuestions(
  user: User,
  questions: ForecastQuestion[],
  grants: AccessGrant[]
): ForecastQuestion[] {
  return questions.filter((q) => canViewQuestion(user, q, grants));
}

/**
 * Returns only PUBLIC questions — used to build org-wide aggregates and shared
 * calibration so private lines can never contaminate them.
 */
export function publicOnly(questions: ForecastQuestion[]): ForecastQuestion[] {
  return questions.filter((q) => q.visibility === "public");
}
