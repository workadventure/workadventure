import { describe, expect, it } from "vitest";
import type { ProximityPoll } from "@workadventure/shared-utils";
import { getNewRemoteProximityPolls, getProximityPollNotificationMessage } from "../ProximityPollNotification";

describe("ProximityPollNotification", () => {
    it("should return only new polls created by another participant", () => {
        const existing = createPoll("poll-1", "Existing poll", "bob-uuid");
        const previousPolls = { "poll-1": existing };
        const nextPolls = {
            "poll-1": existing,
            "poll-2": createPoll("poll-2", "Remote poll", "bob-uuid"),
            "poll-3": createPoll("poll-3", "My poll", "alice-uuid"),
        };

        const polls = getNewRemoteProximityPolls(previousPolls, nextPolls, "alice-uuid");

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

function createPoll(id: string, question: string, senderId: string): ProximityPoll {
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
        votes: {},
    };
}
