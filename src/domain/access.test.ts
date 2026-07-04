import { describe, expect, it } from "vitest";
import { canViewQuestion, publicOnly, visibleQuestions } from "./access";
import type { AccessGrant, ForecastQuestion, User } from "./types";

const base: Omit<ForecastQuestion, "id" | "visibility" | "title"> = {
  preciseDefinition: "",
  category: "Financial",
  type: "binary",
  riskOrOpportunity: "risk",
  impactEstimate: "",
  impactLevel: "medium",
  impactScore: 0.5,
  resolutionCriteria: "",
  resolutionSource: "",
  openDate: "2026-01-01",
  resolutionDate: "2026-12-31",
  status: "open",
  owningTeam: "Finance",
  createdBy: "u-exec",
  priorBaseRate: 0.5,
};

const pub: ForecastQuestion = { ...base, id: "pub", title: "Public Q", visibility: "public" };
const teamQ: ForecastQuestion = { ...base, id: "team", title: "Team Q", visibility: "team", owningTeam: "Strategy" };
const leadQ: ForecastQuestion = { ...base, id: "lead", title: "Leadership Q", visibility: "leadership" };
const restricted: ForecastQuestion = { ...base, id: "restricted", title: "Restricted Q", visibility: "restricted" };

const exec: User = { id: "u-exec", name: "Exec", role: "executive", team: "Executive" };
const analyst: User = { id: "u-analyst", name: "Analyst", role: "analyst", team: "Strategy" };
const riskMgr: User = { id: "u-risk", name: "Risk", role: "risk_manager", team: "Risk" };

const grants: AccessGrant[] = [
  { questionId: "restricted", role: "executive" },
  { questionId: "restricted", userId: "u-analyst" },
];

describe("access control", () => {
  it("public questions are visible to everyone", () => {
    expect(canViewQuestion(analyst, pub, [])).toBe(true);
    expect(canViewQuestion(exec, pub, [])).toBe(true);
  });

  it("team questions are visible to owning team members", () => {
    expect(canViewQuestion(analyst, teamQ, [])).toBe(true);
    const outsider: User = { id: "x", name: "X", role: "analyst", team: "Operations" };
    expect(canViewQuestion(outsider, teamQ, [])).toBe(false);
  });

  it("leadership questions are visible to executives and risk managers", () => {
    expect(canViewQuestion(exec, leadQ, [])).toBe(true);
    expect(canViewQuestion(riskMgr, leadQ, [])).toBe(true);
    expect(canViewQuestion(analyst, leadQ, [])).toBe(false);
  });

  it("restricted questions are hidden without a grant", () => {
    const stranger: User = { id: "x", name: "X", role: "analyst", team: "z" };
    expect(canViewQuestion(stranger, restricted, [])).toBe(false);
  });

  it("restricted questions are visible via role grant", () => {
    expect(canViewQuestion(exec, restricted, grants)).toBe(true);
  });

  it("restricted questions are visible via explicit user grant", () => {
    expect(canViewQuestion(analyst, restricted, grants)).toBe(true);
  });

  it("an analyst without a grant cannot see the restricted line", () => {
    const otherAnalyst: User = { id: "u-other", name: "Other", role: "analyst", team: "Strategy" };
    expect(canViewQuestion(otherAnalyst, restricted, grants)).toBe(false);
  });

  it("visibleQuestions filters out unauthorized restricted questions", () => {
    const otherAnalyst: User = { id: "u-other", name: "Other", role: "analyst", team: "Strategy" };
    const list = visibleQuestions(otherAnalyst, [pub, restricted], grants);
    expect(list.map((q) => q.id)).toEqual(["pub"]);
  });

  it("publicOnly never leaks non-public questions into shared aggregates", () => {
    expect(publicOnly([pub, restricted, teamQ, leadQ]).map((q) => q.id)).toEqual(["pub"]);
  });
});
