import { describe, expect, it } from "vitest";
import {
  competitors,
  competitorMoves,
  competitorQuestionSeeds,
  competitorForQuestion,
  movesForCompetitor,
} from "./competitors";
import { questions, outcomes } from "./seed";

describe("competitor move metadata", () => {
  it("maps every move to a seeded question", () => {
    const questionIds = new Set(questions.map((q) => q.id));
    for (const move of competitorMoves) {
      expect(questionIds.has(move.questionId), `missing question for move ${move.questionId}`).toBe(
        true,
      );
    }
  });

  it("maps every move to a known competitor", () => {
    const competitorIds = new Set(competitors.map((c) => c.id));
    for (const move of competitorMoves) {
      expect(competitorIds.has(move.competitorId), `unknown competitor ${move.competitorId}`).toBe(
        true,
      );
    }
  });

  it("covers every competitor question seed with exactly one move", () => {
    const moveIds = competitorMoves.map((m) => m.questionId);
    expect(new Set(moveIds).size).toBe(moveIds.length);
    for (const seed of competitorQuestionSeeds) {
      expect(competitorForQuestion(seed.id), `no move metadata for seed ${seed.id}`).toBeDefined();
    }
    expect(competitorMoves.length).toBe(competitorQuestionSeeds.length);
  });

  it("gives every competitor at least one tracked move", () => {
    for (const c of competitors) {
      expect(movesForCompetitor(c.id).length).toBeGreaterThan(0);
    }
  });

  it("generates Yes outcomes for every competitor question", () => {
    const yesByQuestion = new Set(
      outcomes.filter((o) => o.label === "Yes").map((o) => o.questionId),
    );
    for (const seed of competitorQuestionSeeds) {
      expect(yesByQuestion.has(seed.id), `no Yes outcome for ${seed.id}`).toBe(true);
    }
  });

  it("keeps competitor questions public so they surface for all roles", () => {
    for (const seed of competitorQuestionSeeds) {
      expect(seed.visibility).toBe("public");
      expect(seed.category).toBe("Competitive");
    }
  });
});
