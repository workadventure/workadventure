import { describe, expect, it } from "vitest";
import type { ProximityQuestion } from "@workadventure/shared-utils";
import { getUnreadRemoteQuestionIds } from "../ProximityQAUnread";

describe("ProximityQAUnread", () => {
    it("should detect new remote questions between two states", () => {
        const existing = createQuestion("question-1", "alice-uuid");
        const previousQuestions = { "question-1": existing };
        const nextQuestions = {
            "question-1": existing,
            "question-2": createQuestion("question-2", "bob-uuid"),
            "question-3": createQuestion("question-3", "current-uuid"),
        };

        expect(getUnreadRemoteQuestionIds(previousQuestions, nextQuestions, "current-uuid")).toEqual(["question-2"]);
    });
});

function createQuestion(id: string, senderId: string): ProximityQuestion {
    return {
        id,
        body: "Question?",
        senderId,
        senderName: senderId,
        createdAt: 10,
        upvotes: {},
    };
}
