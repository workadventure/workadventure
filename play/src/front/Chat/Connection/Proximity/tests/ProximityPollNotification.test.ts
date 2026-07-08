import { describe, expect, it } from "vitest";
import { getProximityPollDefinitionMetadataKey, type ProximityPollDefinitionMetadata } from "../ProximityPollMetadata";
import { getNewRemoteProximityPolls, getProximityPollNotificationMessage } from "../ProximityPollNotification";

describe("ProximityPollNotification", () => {
    it("should return only new polls created by another participant", () => {
        const previousMetadata = new Map<string, unknown>([
            [getProximityPollDefinitionMetadataKey("poll-1"), createPoll("poll-1", "Existing poll", "bob-uuid")],
        ]);
        const nextMetadata = new Map<string, unknown>([
            [getProximityPollDefinitionMetadataKey("poll-1"), createPoll("poll-1", "Existing poll", "bob-uuid")],
            [getProximityPollDefinitionMetadataKey("poll-2"), createPoll("poll-2", "Remote poll", "bob-uuid")],
            [getProximityPollDefinitionMetadataKey("poll-3"), createPoll("poll-3", "My poll", "alice-uuid")],
        ]);

        const polls = getNewRemoteProximityPolls(previousMetadata, nextMetadata, "alice-uuid");

        expect(polls.map((poll) => poll.id)).toEqual(["poll-2"]);
    });

    it("should format the notification message with the poll question", () => {
        expect(getProximityPollNotificationMessage(createPoll("poll-1", "Best fruit?", "bob-uuid"))).toBe(
            "Poll: Best fruit?",
        );
        expect(getProximityPollNotificationMessage(createPoll("poll-1", "Best fruit?", "bob-uuid"), "Sondage")).toBe(
            "Sondage: Best fruit?",
        );
    });
});

function createPoll(id: string, question: string, senderId: string): ProximityPollDefinitionMetadata {
    return {
        id,
        question,
        kind: "open",
        answers: [
            { id: "apple", text: "Apple" },
            { id: "banana", text: "Banana" },
        ],
        maxSelections: 1,
        senderId,
        senderName: senderId,
        createdAt: 10,
    };
}
