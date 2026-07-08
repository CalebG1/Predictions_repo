import { describe, expect, it } from "vitest";
import {
  canApproveContextItem,
  canArchiveContextItem,
  canEditContextItem,
  canViewContextItem,
  requiresApproval,
  visibleContextItems,
} from "./contextAccess";
import type { ContextItem, User } from "./types";

const base: Omit<ContextItem, "id" | "visibility" | "title"> = {
  type: "manual",
  owningTeam: "Strategy",
  createdBy: "u-analyst",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  status: "active",
};

const pub: ContextItem = { ...base, id: "ctx-pub", title: "Public", visibility: "public" };
const team: ContextItem = { ...base, id: "ctx-team", title: "Team", visibility: "team" };
const lead: ContextItem = { ...base, id: "ctx-lead", title: "Leadership", visibility: "leadership" };
const restricted: ContextItem = { ...base, id: "ctx-rest", title: "Restricted", visibility: "restricted" };

const exec: User = { id: "u-exec", name: "Exec", role: "executive", team: "Executive" };
const analyst: User = { id: "u-analyst", name: "Analyst", role: "analyst", team: "Strategy" };
const outsider: User = { id: "u-other", name: "Other", role: "analyst", team: "Operations" };
const riskMgr: User = { id: "u-risk", name: "Risk", role: "risk_manager", team: "Risk" };
const admin: User = { id: "u-admin", name: "Admin", role: "admin", team: "IT" };

describe("context access control", () => {
  it("public items are visible to everyone", () => {
    expect(canViewContextItem(analyst, pub)).toBe(true);
    expect(canViewContextItem(outsider, pub)).toBe(true);
  });

  it("team items are visible to owning team and admin", () => {
    expect(canViewContextItem(analyst, team)).toBe(true);
    expect(canViewContextItem(outsider, team)).toBe(false);
    expect(canViewContextItem(admin, team)).toBe(true);
  });

  it("leadership items are visible to executives and risk managers", () => {
    expect(canViewContextItem(exec, lead)).toBe(true);
    expect(canViewContextItem(riskMgr, lead)).toBe(true);
    expect(canViewContextItem(analyst, lead)).toBe(false);
  });

  it("restricted items are visible to leadership roles", () => {
    expect(canViewContextItem(exec, restricted)).toBe(true);
    expect(canViewContextItem(analyst, restricted)).toBe(false);
  });

  it("analyst on owning team can edit team items", () => {
    expect(canEditContextItem(analyst, team)).toBe(true);
    expect(canEditContextItem(outsider, team)).toBe(false);
  });

  it("admin can edit any non-archived item", () => {
    expect(canEditContextItem(admin, team)).toBe(true);
  });

  it("creator can archive their item", () => {
    expect(canArchiveContextItem(analyst, team)).toBe(true);
    expect(canArchiveContextItem(outsider, team)).toBe(false);
  });

  it("only risk manager and admin can approve", () => {
    expect(canApproveContextItem(riskMgr)).toBe(true);
    expect(canApproveContextItem(admin)).toBe(true);
    expect(canApproveContextItem(analyst)).toBe(false);
  });

  it("requiresApproval for restricted or org_internal", () => {
    expect(requiresApproval({ visibility: "public" })).toBe(false);
    expect(requiresApproval({ visibility: "restricted" })).toBe(true);
    expect(requiresApproval({ visibility: "team", evidenceClass: "org_internal" })).toBe(true);
  });

  it("visibleContextItems filters unauthorized items", () => {
    const list = visibleContextItems(outsider, [pub, team, restricted]);
    expect(list.map((i) => i.id)).toEqual(["ctx-pub"]);
  });
});
