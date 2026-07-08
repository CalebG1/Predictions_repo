import type { ContextItem, Role, User, Visibility } from "./types";
import { userOnTeam } from "./teams";

const LEADERSHIP_ROLES: Role[] = ["executive", "risk_manager", "admin"];
const EDIT_ROLES: Role[] = ["analyst", "risk_manager", "admin"];
const APPROVE_ROLES: Role[] = ["risk_manager", "admin"];

function leadershipCanView(visibility: Visibility, role: Role): boolean {
  if (visibility === "leadership") return LEADERSHIP_ROLES.includes(role);
  if (visibility === "restricted") return LEADERSHIP_ROLES.includes(role);
  return true;
}

export function canViewContextItem(user: User, item: ContextItem): boolean {
  if (item.status === "archived" && user.role !== "admin" && item.createdBy !== user.id) {
    return false;
  }
  switch (item.visibility) {
    case "public":
      return true;
    case "team":
      return userOnTeam(user, item.owningTeam);
    case "leadership":
    case "restricted":
      return leadershipCanView(item.visibility, user.role);
  }
}

export function canEditContextItem(user: User, item: ContextItem): boolean {
  if (item.status === "archived") return false;
  if (user.role === "admin") return true;
  if (item.createdBy === user.id) return true;
  if (!EDIT_ROLES.includes(user.role)) return false;
  return userOnTeam(user, item.owningTeam);
}

export function canApproveContextItem(user: User): boolean {
  return APPROVE_ROLES.includes(user.role);
}

export function canArchiveContextItem(user: User, item: ContextItem): boolean {
  return user.role === "admin" || item.createdBy === user.id;
}

export function visibleContextItems(user: User, items: ContextItem[]): ContextItem[] {
  return items.filter((item) => canViewContextItem(user, item));
}

export function requiresApproval(item: Pick<ContextItem, "visibility" | "evidenceClass">): boolean {
  return item.visibility === "restricted" || item.evidenceClass === "org_internal";
}
