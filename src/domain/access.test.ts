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
const priv: ForecastQuestion = { ...base, id: "priv", title: "Private Q", visibility: "private" };

const exec: User = { id: "u-exec", name: "Exec", role: "executive", team: "Exec" };
const analyst: User = { id: "u-analyst", name: "Analyst", role: "analyst", team: "Strategy" };

const grants: AccessGrant[] = [
  { questionId: "priv", role: "executive" },
  { questionId: "priv", userId: "u-analyst" },
];

describe("access control", () => {
  it("public questions are visible to everyone", () => {
    expect(canViewQuestion(analyst, pub, [])).toBe(true);
    expect(canViewQuestion(exec, pub, [])).toBe(true);
  });

  it("private questions are hidden without a grant", () => {
    const stranger: User = { id: "x", name: "X", role: "analyst", team: "z" };
    expect(canViewQuestion(stranger, priv, [])).toBe(false);
  });

  it("private questions are visible via role grant", () => {
    expect(canViewQuestion(exec, priv, grants)).toBe(true);
  });

  it("private questions are visible via explicit user grant", () => {
    expect(canViewQuestion(analyst, priv, grants)).toBe(true);
  });

  it("an analyst without a grant cannot see the private line", () => {
    const otherAnalyst: User = { id: "u-other", name: "Other", role: "analyst", team: "Strategy" };
    expect(canViewQuestion(otherAnalyst, priv, grants)).toBe(false);
  });

  it("visibleQuestions filters out unauthorized private questions", () => {
    const otherAnalyst: User = { id: "u-other", name: "Other", role: "analyst", team: "Strategy" };
    const list = visibleQuestions(otherAnalyst, [pub, priv], grants);
    expect(list.map((q) => q.id)).toEqual(["pub"]);
  });

  it("publicOnly never leaks private questions into shared aggregates", () => {
    expect(publicOnly([pub, priv]).map((q) => q.id)).toEqual(["pub"]);
  });
});
