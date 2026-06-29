import { describe, expect, it } from "vitest";
import {
    computeProximityQAState,
    getProximityQAAnswerMetadataKey,
    getProximityQADeleteMetadataKey,
    getProximityQAQuestionMetadataKey,
    getProximityQAUpvoteMetadataKey,
    parseProximityQAMetadata,
} from "../ProximityQAMetadata";

describe("ProximityQAMetadata", () => {
    it("should reconstruct active questions and split answered state from metadata", () => {
        const metadata = new Map<string, unknown>([
            [getProximityQAQuestionMetadataKey("question-1"), createQuestion("question-1", "Where is the demo?", 10)],
            [getProximityQAQuestionMetadataKey("question-2"), createQuestion("question-2", "Answered?", 20)],
            [
                getProximityQAAnswerMetadataKey("question-2"),
                { questionId: "question-2", moderatorId: "admin-uuid", answeredAt: 30 },
            ],
        ]);

        const parsed = parseProximityQAMetadata(metadata);

        expect(parsed.questions.map((question) => question.id)).toEqual(["question-1", "question-2"]);
        expect(parsed.answers).toEqual([{ questionId: "question-2", moderatorId: "admin-uuid", answeredAt: 30 }]);
    });

    it("should count one upvote per voter and ignore author self-upvotes", () => {
        const question = createQuestion("question-1", "Can we record this?", 10);
        const metadata = new Map<string, unknown>([
            [getProximityQAQuestionMetadataKey("question-1"), question],
            [
                getProximityQAUpvoteMetadataKey("question-1", "alice-uuid"),
                { questionId: "question-1", voterId: "alice-uuid", upvoted: true, updatedAt: 11 },
            ],
            [
                getProximityQAUpvoteMetadataKey("question-1", "bob-uuid"),
                { questionId: "question-1", voterId: "bob-uuid", upvoted: true, updatedAt: 12 },
            ],
            [
                getProximityQAUpvoteMetadataKey("question-1", "bob-uuid"),
                { questionId: "question-1", voterId: "bob-uuid", upvoted: false, updatedAt: 13 },
            ],
        ]);
        const parsed = parseProximityQAMetadata(metadata);

        const state = computeProximityQAState(question, parsed.upvotes, undefined, "bob-uuid", true, true);

        expect(state.upvoteCount).toBe(1);
        expect(state.hasUpvoted).toBe(false);
        expect(state.canUpvote).toBe(false);
        expect(state.canDelete).toBe(true);
        expect(state.canMarkAnswered).toBe(true);
    });

    it("should filter deleted questions and sort open questions by priority then creation date", () => {
        const metadata = new Map<string, unknown>([
            [getProximityQAQuestionMetadataKey("question-1"), createQuestion("question-1", "Low priority", 10)],
            [getProximityQAQuestionMetadataKey("question-2"), createQuestion("question-2", "High priority", 20)],
            [getProximityQAQuestionMetadataKey("question-3"), createQuestion("question-3", "Deleted", 30)],
            [
                getProximityQAUpvoteMetadataKey("question-2", "alice-uuid"),
                { questionId: "question-2", voterId: "alice-uuid", upvoted: true, updatedAt: 31 },
            ],
            [
                getProximityQADeleteMetadataKey("question-3"),
                { questionId: "question-3", senderId: "author-uuid", deletedAt: 40 },
            ],
        ]);
        const parsed = parseProximityQAMetadata(metadata);

        const openQuestions = parsed.questions
            .filter((question) => !parsed.deletions.some((deletion) => deletion.questionId === question.id))
            .map((question) => computeProximityQAState(question, parsed.upvotes, undefined, "alice-uuid", false, false))
            .sort((left, right) => right.upvoteCount - left.upvoteCount || left.createdAt - right.createdAt);

        expect(openQuestions.map((question) => question.id)).toEqual(["question-2", "question-1"]);
    });
});

function createQuestion(id: string, body: string, createdAt: number) {
    return {
        id,
        body,
        senderId: "bob-uuid",
        senderName: "Bob",
        createdAt,
    };
}
