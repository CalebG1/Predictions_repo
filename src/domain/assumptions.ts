// Domain logic for question assumptions: perspective identity, permissions, and
// derived views. See docs/prd/questions-assumptions-section.md for the product spec.

import type {
  AssumptionConfidence,
  AssumptionEvidenceLink,
  AssumptionEvidenceRelationship,
  AssumptionPerspectiveType,
  AssumptionProposal,
  AssumptionStatus,
  ForecastQuestion,
  QuestionAssumption,
  User,
} from "./types";

export function newAssumptionId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Perspective identity ---
// Local and shared perspectives always exist (they're derived, not stored as
// separate records); person perspectives exist once a user shares an assumption.

export function localPerspectiveId(questionId: string, userId: string): string {
  return `local:${questionId}:${userId}`;
}

export function sharedPerspectiveId(questionId: string): string {
  return `shared:${questionId}`;
}

export function personPerspectiveId(questionId: string, userId: string): string {
  return `person:${questionId}:${userId}`;
}

export function perspectiveType(perspectiveId: string): AssumptionPerspectiveType | null {
  if (perspectiveId.startsWith("local:")) return "local";
  if (perspectiveId.startsWith("shared:")) return "shared";
  if (perspectiveId.startsWith("person:")) return "person";
  return null;
}

/** Extracts the subject user id encoded in a `local:` or `person:` perspective id. */
export function perspectiveSubjectUserId(perspectiveId: string): string | undefined {
  const type = perspectiveType(perspectiveId);
  if (type !== "local" && type !== "person") return undefined;
  const parts = perspectiveId.split(":");
  return parts[2];
}

export interface AssumptionPerspectiveOption {
  id: string;
  type: AssumptionPerspectiveType;
  name: string;
  group: "Private" | "Team" | "People";
  subjectUserId?: string;
  isOwn: boolean;
  count: number;
}

/**
 * Builds the perspective dropdown: My local assumptions (always), Shared working
 * view (always), then one entry per person who has shared at least one assumption.
 */
export function buildPerspectiveOptions(
  questionId: string,
  currentUser: User,
  allUsers: User[],
  assumptions: QuestionAssumption[],
): AssumptionPerspectiveOption[] {
  const countFor = (perspectiveId: string) =>
    assumptions.filter((a) => a.questionId === questionId && a.perspectiveId === perspectiveId)
      .length;

  const options: AssumptionPerspectiveOption[] = [
    {
      id: localPerspectiveId(questionId, currentUser.id),
      type: "local",
      name: "My local assumptions",
      group: "Private",
      subjectUserId: currentUser.id,
      isOwn: true,
      count: countFor(localPerspectiveId(questionId, currentUser.id)),
    },
    {
      id: sharedPerspectiveId(questionId),
      type: "shared",
      name: "Shared working view",
      group: "Team",
      isOwn: false,
      count: countFor(sharedPerspectiveId(questionId)),
    },
  ];

  const peopleWithShares = new Set(
    assumptions
      .filter((a) => a.questionId === questionId && perspectiveType(a.perspectiveId) === "person")
      .map((a) => perspectiveSubjectUserId(a.perspectiveId))
      .filter((id): id is string => !!id),
  );

  const people = [...peopleWithShares]
    .map((userId) => {
      const person = allUsers.find((u) => u.id === userId);
      const isOwn = userId === currentUser.id;
      return {
        id: personPerspectiveId(questionId, userId),
        type: "person" as const,
        name: isOwn ? "My shared view" : `${person?.name ?? "Unknown"}'s shared view`,
        group: "People" as const,
        subjectUserId: userId,
        isOwn,
        count: countFor(personPerspectiveId(questionId, userId)),
      };
    })
    .sort((a, b) => (a.isOwn === b.isOwn ? a.name.localeCompare(b.name) : a.isOwn ? -1 : 1));

  return [...options, ...people];
}

/**
 * Enforces the two-state visibility model: a user's own local assumptions are
 * private; Shared working view and everyone's shared (person) perspectives are
 * visible to anyone who can already see the question.
 */
export function visibleAssumptionsForQuestion(
  questionId: string,
  currentUser: User,
  allAssumptions: QuestionAssumption[],
): QuestionAssumption[] {
  return allAssumptions.filter((a) => {
    if (a.questionId !== questionId) return false;
    if (perspectiveType(a.perspectiveId) === "local") {
      return perspectiveSubjectUserId(a.perspectiveId) === currentUser.id;
    }
    return true;
  });
}

/** Only the author, editing within their own local perspective, may change assumption text. */
export function canEditAssumption(user: User, assumption: QuestionAssumption): boolean {
  return (
    assumption.createdBy === user.id &&
    assumption.perspectiveId === localPerspectiveId(assumption.questionId, user.id)
  );
}

/** The question owner (creator) or an admin decides what enters the Shared working view. */
export function canApproveProposals(user: User, question: ForecastQuestion): boolean {
  return user.role === "admin" || user.id === question.createdBy;
}

export function evidenceLinksFor(
  assumptionId: string,
  links: AssumptionEvidenceLink[],
): AssumptionEvidenceLink[] {
  return links.filter((l) => l.assumptionId === assumptionId);
}

/** e.g. "2 support · 1 contradicts · 1 context" for the row summary. */
export function evidenceSignalSummary(links: AssumptionEvidenceLink[]): string {
  if (links.length === 0) return "No linked evidence";
  const counts: Record<AssumptionEvidenceRelationship, number> = {
    supports: 0,
    contradicts: 0,
    context: 0,
  };
  for (const l of links) counts[l.relationship]++;
  const parts: string[] = [];
  if (counts.supports) parts.push(`${counts.supports} support${counts.supports === 1 ? "" : "s"}`);
  if (counts.contradicts)
    parts.push(`${counts.contradicts} contradict${counts.contradicts === 1 ? "s" : "s"}`);
  if (counts.context) parts.push(`${counts.context} context`);
  return parts.join(" · ");
}

export function proposalsForQuestion(
  questionId: string,
  proposals: AssumptionProposal[],
): AssumptionProposal[] {
  return proposals
    .filter((p) => p.questionId === questionId)
    .sort((a, b) => b.proposedAt.localeCompare(a.proposedAt));
}

export const ASSUMPTION_STATUS_LABELS: Record<AssumptionStatus, string> = {
  active: "Active",
  pending_review: "Pending review",
  uncertain: "Uncertain",
  challenged: "Challenged",
  invalidated: "Invalidated",
  archived: "Archived",
};

export const ASSUMPTION_CHANGE_LABELS: Record<AssumptionProposal["changeType"], string> = {
  add: "Team default",
  edit: "Edit",
  status: "Status",
  archive: "Archive",
  publish_viewing: "For viewing",
};

export const ASSUMPTION_CONFIDENCE_LABELS: Record<AssumptionConfidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

export const EVIDENCE_RELATIONSHIP_LABELS: Record<AssumptionEvidenceRelationship, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  context: "Provides context",
};
