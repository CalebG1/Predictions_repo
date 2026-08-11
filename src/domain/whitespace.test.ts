import { describe, expect, it } from "vitest";
import { createQuestionFromInput } from "./generateQuestion";
import { questions } from "./seed";
import { users } from "./seed";
import {
  bookQuestions,
  buildWhiteSpaceCandidates,
  coverageMatrix,
  whiteSpaceCandidateById,
  whiteSpaceLibrary,
} from "./whitespace";
import type { ForecastQuestion } from "./types";

describe("coverageMatrix", () => {
  it("counts open non-standards questions by category × side", () => {
    const matrix = coverageMatrix(questions);
    const book = bookQuestions(questions);
    let total = 0;
    for (const cat of Object.keys(matrix) as (keyof typeof matrix)[]) {
      total += matrix[cat].risk + matrix[cat].opportunity;
    }
    expect(total).toBe(book.length);
  });

  it("marks Product × risk as empty in the seed book", () => {
    const matrix = coverageMatrix(questions);
    expect(matrix.Product.risk).toBe(0);
    expect(matrix.Product.opportunity).toBeGreaterThan(0);
  });

  it("marks Competitive × opportunity as empty in the seed book", () => {
    const matrix = coverageMatrix(questions);
    expect(matrix.Competitive.opportunity).toBe(0);
    expect(matrix.Competitive.risk).toBeGreaterThan(0);
  });
});

describe("buildWhiteSpaceCandidates", () => {
  it("surfaces the Product × risk coverage gap against the seed book", () => {
    const candidates = buildWhiteSpaceCandidates(questions);
    expect(candidates.some((c) => c.id === "ws-cov-product-risk")).toBe(true);
  });

  it("balances risks and opportunities in the active set", () => {
    const candidates = buildWhiteSpaceCandidates(questions);
    const risks = candidates.filter((c) => c.riskOrOpportunity === "risk").length;
    const opps = candidates.filter((c) => c.riskOrOpportunity === "opportunity").length;
    expect(risks).toBeGreaterThan(0);
    expect(opps).toBeGreaterThan(0);
  });

  it("drops a coverage-gap candidate once the cell is filled", () => {
    const filler: ForecastQuestion = {
      id: "q-test-product-risk",
      title: "Will a product regression force a rollback?",
      preciseDefinition: "Test filler for Product risk cell.",
      category: "Product",
      type: "binary",
      riskOrOpportunity: "risk",
      impactEstimate: "Material",
      impactLevel: "high",
      impactScore: 0.7,
      resolutionCriteria: "Resolves YES on rollback.",
      resolutionSource: "Internal",
      openDate: "2026-01-01",
      resolutionDate: "2026-12-31",
      status: "open",
      visibility: "public",
      owningTeam: "Risk",
      createdBy: "u-1",
      priorBaseRate: 0.3,
    };
    const before = buildWhiteSpaceCandidates(questions);
    expect(before.some((c) => c.id === "ws-cov-product-risk")).toBe(true);

    const after = buildWhiteSpaceCandidates([...questions, filler]);
    expect(after.some((c) => c.id === "ws-cov-product-risk")).toBe(false);
  });

  it("sorts high materiality before medium/low", () => {
    const candidates = buildWhiteSpaceCandidates(questions);
    const ranks = { high: 0, medium: 1, low: 2 } as const;
    for (let i = 1; i < candidates.length; i++) {
      expect(ranks[candidates[i].materiality]).toBeGreaterThanOrEqual(
        ranks[candidates[i - 1].materiality],
      );
    }
  });

  it("keeps the curated library balanced across sides", () => {
    const risks = whiteSpaceLibrary.filter((c) => c.riskOrOpportunity === "risk").length;
    const opps = whiteSpaceLibrary.filter((c) => c.riskOrOpportunity === "opportunity").length;
    expect(Math.abs(risks - opps)).toBeLessThanOrEqual(6);
    expect(whiteSpaceLibrary.length).toBeGreaterThanOrEqual(20);
  });
});

describe("promotion input", () => {
  it("round-trips through createQuestionFromInput with intended category and side", () => {
    const candidate = whiteSpaceCandidateById("ws-cov-product-risk");
    expect(candidate).toBeDefined();
    const user = users[0];
    const bundle = createQuestionFromInput(candidate!.createInput, user);
    expect(bundle.question.category).toBe("Product");
    expect(bundle.question.riskOrOpportunity).toBe("risk");
    expect(bundle.question.status).toBe("open");
    expect(bundle.outcomes.some((o) => o.label === "Yes")).toBe(true);
  });

  it("preserves standards-checklist category on ARR candidate", () => {
    const candidate = whiteSpaceCandidateById("ws-std-arr");
    expect(candidate).toBeDefined();
    const bundle = createQuestionFromInput(candidate!.createInput, users[0]);
    expect(bundle.question.category).toBe("Financial");
    expect(bundle.question.riskOrOpportunity).toBe("opportunity");
  });
});
