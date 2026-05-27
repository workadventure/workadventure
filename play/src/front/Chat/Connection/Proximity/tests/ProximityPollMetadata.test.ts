import { describe, expect, it } from "vitest";
import {
    computeProximityPollState,
    getProximityPollDefinitionMetadataKey,
    getProximityPollEndMetadataKey,
    getProximityPollVoteMetadataKey,
    parseProximityPollMetadata,
} from "../ProximityPollMetadata";

describe("ProximityPollMetadata", () => {
    it("should reconstruct multiple active polls from separated metadata keys when a user joins later", () => {
        const metadata = new Map<string, unknown>([
            [
                getProximityPollDefinitionMetadataKey("poll-1"),
                {
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
                },
            ],
            [
                getProximityPollDefinitionMetadataKey("poll-2"),
                {
                    id: "poll-2",
                    question: "Best drink?",
                    kind: "closed",
                    answers: [
                        { id: "water", text: "Water" },
                        { id: "tea", text: "Tea" },
                    ],
                    maxSelections: 1,
                    senderId: "creator-uuid",
                    senderName: "Creator",
                    createdAt: 20,
                },
            ],
        ]);

        const parsed = parseProximityPollMetadata(metadata);

        expect(parsed.polls.map((poll) => poll.id)).toEqual(["poll-1", "poll-2"]);
        expect(parsed.votes).toHaveLength(0);
        expect(parsed.ends).toHaveLength(0);
    });

    it("should count votes from separated vote keys without overwriting concurrent voters", () => {
        const poll = {
            id: "poll-1",
            question: "Best fruit?",
            kind: "open" as const,
            answers: [
                { id: "apple", text: "Apple" },
                { id: "banana", text: "Banana" },
            ],
            maxSelections: 1,
            senderId: "creator-uuid",
            senderName: "Creator",
            createdAt: 10,
        };
        const metadata = new Map<string, unknown>([
            [getProximityPollDefinitionMetadataKey("poll-1"), poll],
            [
                getProximityPollVoteMetadataKey("poll-1", "alice-uuid"),
                { pollId: "poll-1", voterId: "alice-uuid", answerIds: ["apple"], updatedAt: 11 },
            ],
            [
                getProximityPollVoteMetadataKey("poll-1", "bob-uuid"),
                { pollId: "poll-1", voterId: "bob-uuid", answerIds: ["banana"], updatedAt: 12 },
            ],
        ]);
        const parsed = parseProximityPollMetadata(metadata);

        const state = computeProximityPollState(poll, parsed.votes, undefined, "alice-uuid");

        expect(state.totalVotes).toBe(2);
        expect(state.myAnswerIds).toEqual(["apple"]);
        expect(state.answers.find((answer) => answer.id === "apple")?.votes).toBe(1);
        expect(state.answers.find((answer) => answer.id === "banana")?.votes).toBe(1);
    });

    it("should make Matrix-style open poll results visible only after the current user votes", () => {
        const poll = {
            id: "poll-1",
            question: "Best fruit?",
            kind: "open" as const,
            answers: [
                { id: "apple", text: "Apple" },
                { id: "banana", text: "Banana" },
            ],
            maxSelections: 1,
            senderId: "creator-uuid",
            senderName: "Creator",
            createdAt: 10,
        };

        const beforeVote = computeProximityPollState(poll, [], undefined, "alice-uuid");
        const afterVote = computeProximityPollState(
            poll,
            [{ pollId: "poll-1", voterId: "alice-uuid", answerIds: ["banana"], updatedAt: 11 }],
            undefined,
            "alice-uuid"
        );

        expect(beforeVote.resultsVisible).toBe(false);
        expect(afterVote.resultsVisible).toBe(true);
    });

    it("should keep only the latest vote for the same stable voter identity", () => {
        const poll = {
            id: "poll-1",
            question: "Best fruit?",
            kind: "open" as const,
            answers: [
                { id: "apple", text: "Apple" },
                { id: "banana", text: "Banana" },
            ],
            maxSelections: 1,
            senderId: "creator-uuid",
            senderName: "Creator",
            createdAt: 10,
        };

        const state = computeProximityPollState(
            poll,
            [
                { pollId: "poll-1", voterId: "alice-uuid", answerIds: ["apple"], updatedAt: 11 },
                { pollId: "poll-1", voterId: "alice-uuid", answerIds: ["banana"], updatedAt: 12 },
            ],
            undefined,
            "alice-uuid"
        );

        expect(state.totalVotes).toBe(1);
        expect(state.myAnswerIds).toEqual(["banana"]);
        expect(state.answers.find((answer) => answer.id === "apple")?.votes).toBe(0);
        expect(state.answers.find((answer) => answer.id === "banana")?.votes).toBe(1);
    });

    it("should keep closed poll results hidden until the creator closes it", () => {
        const poll = {
            id: "poll-1",
            question: "Best fruit?",
            kind: "closed" as const,
            answers: [
                { id: "apple", text: "Apple" },
                { id: "banana", text: "Banana" },
            ],
            maxSelections: 1,
            senderId: "creator-uuid",
            senderName: "Creator",
            createdAt: 10,
        };
        const votes = [{ pollId: "poll-1", voterId: "alice-uuid", answerIds: ["banana"], updatedAt: 11 }];

        const beforeEnd = computeProximityPollState(poll, votes, undefined, "alice-uuid");
        const afterEnd = computeProximityPollState(
            poll,
            votes,
            {
                pollId: "poll-1",
                senderId: "creator-uuid",
                closingMessage: "Poll closed",
                closedAt: 12,
            },
            "alice-uuid"
        );

        expect(beforeEnd.resultsVisible).toBe(false);
        expect(afterEnd.resultsVisible).toBe(true);
        expect(afterEnd.closingMessage).toBe("Poll closed");
    });

    it("should parse creator-only end and delete metadata", () => {
        const metadata = new Map<string, unknown>([
            [
                getProximityPollEndMetadataKey("poll-1"),
                { pollId: "poll-1", senderId: "creator-uuid", closingMessage: "Done", closedAt: 12 },
            ],
            ["proximityPollDelete:poll-1", { pollId: "poll-1", senderId: "creator-uuid", deletedAt: 13 }],
        ]);

        const parsed = parseProximityPollMetadata(metadata);

        expect(parsed.ends).toEqual([
            { pollId: "poll-1", senderId: "creator-uuid", closingMessage: "Done", closedAt: 12 },
        ]);
        expect(parsed.deletions).toEqual([{ pollId: "poll-1", senderId: "creator-uuid", deletedAt: 13 }]);
    });
});
