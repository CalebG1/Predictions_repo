// Hard authorization boundary for question visibility levels.
// Restricted lines must never leak into public aggregates, feeds, or shared
// calibration views.

import type { AccessGrant, ForecastQuestion, Role, User } from "./types";

const LEADERSHIP_ROLES: Role[] = ["executive", "risk_manager", "admin"];

function hasGrant(user: User, questionId: string, grants: AccessGrant[]): boolean {
  return grants.some(
    (g) =>
      g.questionId === questionId &&
      ((g.userId && g.userId === user.id) || (g.role && g.role === user.role))
  );
}

export function canViewQuestion(
  user: User,
  question: ForecastQuestion,
  grants: AccessGrant[]
): boolean {
  switch (question.visibility) {
    case "public":
      return true;
    case "team":
      return user.team === question.owningTeam || user.role === "admin" || hasGrant(user, question.id, grants);
    case "leadership":
      return LEADERSHIP_ROLES.includes(user.role) || hasGrant(user, question.id, grants);
    case "restricted":
      return hasGrant(user, question.id, grants);
  }
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
 * calibration so non-public lines can never contaminate them.
 */
export function publicOnly(questions: ForecastQuestion[]): ForecastQuestion[] {
  return questions.filter((q) => q.visibility === "public");
}
