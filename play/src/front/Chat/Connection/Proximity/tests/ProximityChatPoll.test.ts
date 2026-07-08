import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import { ProximityChatPoll } from "../ProximityChatPoll";
import {
    getProximityPollDeleteMetadataKey,
    getProximityPollEndMetadataKey,
    getProximityPollVoteMetadataKey,
    type ProximityPollDefinitionMetadata,
} from "../ProximityPollMetadata";

describe("ProximityChatPoll", () => {
    it("should write the current user's latest vote to a dedicated metadata key", async () => {
        const metadataUpdates: Map<string, unknown>[] = [];
        const poll = new ProximityChatPoll({
            definition: createPollDefinition(),
            votes: [],
            end: undefined,
            currentVoterId: "alice-uuid",
            sender: undefined,
            updateMetadata: (metadata) => metadataUpdates.push(metadata),
        });

        await poll.vote(["banana"]);

        expect(metadataUpdates).toHaveLength(1);
        expect(metadataUpdates[0].get(getProximityPollVoteMetadataKey("poll-1", "alice-uuid"))).toMatchObject({
            pollId: "poll-1",
            voterId: "alice-uuid",
            answerIds: ["banana"],
        });
    });

    it("should update the same state store when metadata votes change", () => {
        const poll = new ProximityChatPoll({
            definition: createPollDefinition(),
            votes: [],
            end: undefined,
            currentVoterId: "alice-uuid",
            sender: undefined,
            updateMetadata: () => {},
        });
        const observedAnswerIds: string[][] = [];
        const unsubscribe = poll.state.subscribe((state) => {
            observedAnswerIds.push(state.myAnswerIds);
        });

        poll.update({
            votes: [{ pollId: "poll-1", voterId: "alice-uuid", answerIds: ["banana"], updatedAt: 11 }],
            end: undefined,
            currentVoterId: "alice-uuid",
            sender: undefined,
        });
        unsubscribe();

        expect(observedAnswerIds).toEqual([[], ["banana"]]);
        expect(get(poll.state).resultsVisible).toBe(true);
    });

    it("should allow only the creator to end and delete the poll", async () => {
        const metadataUpdates: Map<string, unknown>[] = [];
        const participantPoll = new ProximityChatPoll({
            definition: createPollDefinition(),
            votes: [],
            end: undefined,
            currentVoterId: "alice-uuid",
            sender: undefined,
            updateMetadata: (metadata) => metadataUpdates.push(metadata),
        });
        const creatorPoll = new ProximityChatPoll({
            definition: createPollDefinition(),
            votes: [],
            end: undefined,
            currentVoterId: "creator-uuid",
            sender: undefined,
            updateMetadata: (metadata) => metadataUpdates.push(metadata),
        });

        await expect(participantPoll.end()).rejects.toThrow("Only the poll creator can close this poll");
        await creatorPoll.end();
        await creatorPoll.remove();

        expect(get(participantPoll.canEnd)).toBe(false);
        expect(get(creatorPoll.canEnd)).toBe(true);
        expect(metadataUpdates[0].get(getProximityPollEndMetadataKey("poll-1"))).toMatchObject({
            pollId: "poll-1",
            senderId: "creator-uuid",
        });
        expect(metadataUpdates[1].get(getProximityPollDeleteMetadataKey("poll-1"))).toMatchObject({
            pollId: "poll-1",
            senderId: "creator-uuid",
        });
    });
});

function createPollDefinition(): ProximityPollDefinitionMetadata {
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
    };
}
