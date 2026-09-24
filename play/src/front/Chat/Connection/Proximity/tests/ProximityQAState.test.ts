import { describe, expect, it } from "vitest";
import type { ProximityQuestion } from "@workadventure/shared-utils";
import { computeProximityQAState, sortProximityQuestions } from "../ProximityQAState";

function createQuestion(overrides: Partial<ProximityQuestion> = {}): ProximityQuestion {
    return {
        id: "question-1",
        body: "Can we record this?",
        senderId: "bob-uuid",
        senderName: "Bob",
        createdAt: 10,
        upvotes: {},
        ...overrides,
    };
}

describe("ProximityQAState", () => {
    it("should list the questions of the state by creation date", () => {
        const questions = {
            "question-2": createQuestion({ id: "question-2", createdAt: 20 }),
            "question-1": createQuestion({ id: "question-1", createdAt: 10 }),
        };

        expect(sortProximityQuestions(questions).map((question) => question.id)).toEqual(["question-1", "question-2"]);
    });

    it("should count one upvote per voter and ignore the author's own", () => {
        const question = createQuestion({ upvotes: { "alice-uuid": 11, "bob-uuid": 12 } });

        const state = computeProximityQAState(question, "bob-uuid", true, true);

        expect(state.upvoteCount).toBe(1);
        expect(state.hasUpvoted).toBe(false);
        expect(state.canUpvote).toBe(false);
        expect(state.canDelete).toBe(true);
        expect(state.canMarkAnswered).toBe(true);
    });

    it("should close an answered question to upvotes and to marking it again", () => {
        const question = createQuestion({ answer: { moderatorId: "admin-uuid", answeredAt: 30 } });

        const state = computeProximityQAState(question, "alice-uuid", true, false);

        expect(state.isAnswered).toBe(true);
        expect(state.canUpvote).toBe(false);
        expect(state.canMarkAnswered).toBe(false);
    });
});
