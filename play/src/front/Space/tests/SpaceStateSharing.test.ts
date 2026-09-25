import { describe, expect, it } from "vitest";
import type { ProximityPoll, SpaceState } from "@workadventure/shared-utils";
import { emptySpaceState } from "@workadventure/shared-utils";
import { shareUnchanged } from "../SpaceStateSharing";

function poll(id: string): ProximityPoll {
    return {
        id,
        question: "Lunch?",
        kind: "open",
        answers: [
            { id: "a", text: "Pizza" },
            { id: "b", text: "Sushi" },
        ],
        maxSelections: 1,
        senderId: "alice",
        createdAt: 10,
        votes: {},
    };
}

describe("shareUnchanged", () => {
    const previous: SpaceState = { ...emptySpaceState(), polls: { a: poll("a"), b: poll("b") } };

    it("keeps every untouched slice when only the raised hands change", () => {
        const next = structuredClone(previous);
        next.raisedHands.push({ spaceUserId: "bob", name: "Bob", at: 1 });

        const shared = shareUnchanged(previous, next);

        expect(shared.raisedHands).toBe(next.raisedHands);
        expect(shared.polls).toBe(previous.polls);
        expect(shared.questions).toBe(previous.questions);
        expect(shared.recording).toBe(previous.recording);
    });

    it("keeps the other polls when one poll gets a vote", () => {
        const next = structuredClone(previous);
        next.polls.a.votes.bob = { answerIds: ["a"], updatedAt: 11 };

        const shared = shareUnchanged(previous, next);

        expect(shared.polls).not.toBe(previous.polls);
        expect(shared.polls.a).toBe(next.polls.a);
        expect(shared.polls.b).toBe(previous.polls.b);
    });

    it("sees a removed poll as a change", () => {
        const next = structuredClone(previous);
        delete next.polls.b;

        expect(Object.keys(shareUnchanged(previous, next).polls)).toEqual(["a"]);
    });
});
