import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import type { ProximityPoll } from "@workadventure/shared-utils";
import { ProximityChatPoll } from "../ProximityChatPoll";

function createSpace() {
    return {
        votePoll: vi.fn().mockResolvedValue(undefined),
        closePoll: vi.fn().mockResolvedValue(undefined),
        deletePoll: vi.fn().mockResolvedValue(undefined),
    };
}

describe("ProximityChatPoll", () => {
    it("should send the current user's vote to the space, as themselves", async () => {
        const space = createSpace();
        const poll = new ProximityChatPoll({
            poll: createPoll(),
            currentVoterId: "alice-uuid",
            sender: undefined,
            space,
        });

        await poll.vote(["banana"]);

        expect(space.votePoll).toHaveBeenCalledWith("poll-1", ["banana"], "alice-uuid");
    });

    it("should update the same state store when the votes change", () => {
        const poll = new ProximityChatPoll({
            poll: createPoll(),
            currentVoterId: "alice-uuid",
            sender: undefined,
            space: createSpace(),
        });
        const observedAnswerIds: string[][] = [];
        const unsubscribe = poll.state.subscribe((state) => {
            observedAnswerIds.push(state.myAnswerIds);
        });

        poll.update({
            poll: { ...createPoll(), votes: { "alice-uuid": { answerIds: ["banana"], updatedAt: 11 } } },
            currentVoterId: "alice-uuid",
            sender: undefined,
        });
        unsubscribe();

        expect(observedAnswerIds).toEqual([[], ["banana"]]);
        expect(get(poll.state).resultsVisible).toBe(true);
    });

    it("should allow only the creator to end and delete the poll", async () => {
        const space = createSpace();
        const participantPoll = new ProximityChatPoll({
            poll: createPoll(),
            currentVoterId: "alice-uuid",
            sender: undefined,
            space,
        });
        const creatorPoll = new ProximityChatPoll({
            poll: createPoll(),
            currentVoterId: "creator-uuid",
            sender: undefined,
            space,
        });

        await expect(participantPoll.end()).rejects.toThrow("Only the poll creator can close this poll");
        await creatorPoll.end();
        await creatorPoll.remove();

        expect(get(participantPoll.canEnd)).toBe(false);
        expect(get(creatorPoll.canEnd)).toBe(true);
        expect(space.closePoll).toHaveBeenCalledOnce();
        expect(space.closePoll).toHaveBeenCalledWith("poll-1");
        expect(space.deletePoll).toHaveBeenCalledWith("poll-1");
    });

    it("should refuse a vote on a closed poll without asking the space", async () => {
        const space = createSpace();
        const poll = new ProximityChatPoll({
            poll: { ...createPoll(), end: { closedAt: 12 } },
            currentVoterId: "alice-uuid",
            sender: undefined,
            space,
        });

        await expect(poll.vote(["banana"])).rejects.toThrow();
        expect(space.votePoll).not.toHaveBeenCalled();
    });
    it("does not recompute nor re-emit when the poll did not change", () => {
        const pollState = createPoll();
        const poll = new ProximityChatPoll({
            poll: pollState,
            currentVoterId: "alice-uuid",
            sender: undefined,
            space: createSpace(),
        });
        const listener = vi.fn();
        const unsubscribe = poll.state.subscribe(listener);

        poll.update({ poll: pollState, currentVoterId: "alice-uuid", sender: undefined });
        unsubscribe();

        expect(listener).toHaveBeenCalledTimes(1);
    });
});

function createPoll(): ProximityPoll {
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
    };
}
