import { describe, expect, it } from "vitest";
import type { ProximityPoll } from "@workadventure/shared-utils";
import { computeProximityPollState, sortByCreatedAt } from "../ProximityPollState";

function createPoll(overrides: Partial<ProximityPoll> = {}): ProximityPoll {
    return {
        id: "poll-1",
        question: "Best fruit?",
        kind: "open",
        answers: [
            { id: "apple", text: "Apple" },
            { id: "banana", text: "Banana" },
        ],
        maxSelections: 1,
        senderId: "creator-uuid",
        senderName: "Creator",
        createdAt: 10,
        votes: {},
        ...overrides,
    };
}

describe("ProximityPollState", () => {
    it("should list the polls of the state by creation date", () => {
        const polls = {
            "poll-2": createPoll({ id: "poll-2", createdAt: 20 }),
            "poll-1": createPoll({ id: "poll-1", createdAt: 10 }),
        };

        expect(sortByCreatedAt(polls).map((poll) => poll.id)).toEqual(["poll-1", "poll-2"]);
    });

    it("should count one vote per voter", () => {
        const poll = createPoll({
            votes: {
                "alice-uuid": { answerIds: ["apple"], updatedAt: 11 },
                "bob-uuid": { answerIds: ["banana"], updatedAt: 12 },
            },
        });

        const state = computeProximityPollState(poll, "alice-uuid");

        expect(state.totalVotes).toBe(2);
        expect(state.myAnswerIds).toEqual(["apple"]);
        expect(state.answers.find((answer) => answer.id === "apple")?.votes).toBe(1);
        expect(state.answers.find((answer) => answer.id === "banana")?.votes).toBe(1);
    });

    it("should make open poll results visible only after the current user votes", () => {
        const beforeVote = computeProximityPollState(createPoll(), "alice-uuid");
        const afterVote = computeProximityPollState(
            createPoll({ votes: { "alice-uuid": { answerIds: ["banana"], updatedAt: 11 } } }),
            "alice-uuid",
        );

        expect(beforeVote.resultsVisible).toBe(false);
        expect(afterVote.resultsVisible).toBe(true);
    });

    it("should keep closed poll results hidden until the creator closes it", () => {
        const votes = { "alice-uuid": { answerIds: ["banana"], updatedAt: 11 } };

        const beforeEnd = computeProximityPollState(createPoll({ kind: "closed", votes }), "alice-uuid");
        const afterEnd = computeProximityPollState(
            createPoll({ kind: "closed", votes, end: { closingMessage: "Poll closed", closedAt: 12 } }),
            "alice-uuid",
        );

        expect(beforeEnd.resultsVisible).toBe(false);
        expect(afterEnd.resultsVisible).toBe(true);
        expect(afterEnd.closingMessage).toBe("Poll closed");
    });
});
