import { describe, expect, it } from "vitest";
import { getUnreadRemoteQuestionIds } from "../ProximityQAUnread";
import { getProximityQAQuestionMetadataKey } from "../ProximityQAMetadata";

describe("ProximityQAUnread", () => {
    it("should detect new remote questions from metadata diffs", () => {
        const previousMetadata = new Map<string, unknown>([
            [getProximityQAQuestionMetadataKey("question-1"), createQuestion("question-1", "alice-uuid")],
        ]);
        const nextMetadata = new Map<string, unknown>([
            [getProximityQAQuestionMetadataKey("question-1"), createQuestion("question-1", "alice-uuid")],
            [getProximityQAQuestionMetadataKey("question-2"), createQuestion("question-2", "bob-uuid")],
            [getProximityQAQuestionMetadataKey("question-3"), createQuestion("question-3", "current-uuid")],
        ]);

        expect(getUnreadRemoteQuestionIds(previousMetadata, nextMetadata, "current-uuid")).toEqual(["question-2"]);
    });
});

function createQuestion(id: string, senderId: string) {
    return {
        id,
        body: "Question?",
        senderId,
        senderName: senderId,
        createdAt: 10,
    };
}
