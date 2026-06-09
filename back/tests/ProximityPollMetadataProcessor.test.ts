import { describe, expect, it } from "vitest";
import { processProximityPollMetadata } from "../src/Model/ProximityPollMetadataProcessor";

describe("ProximityPollMetadataProcessor", () => {
    it("should accept poll creation when sender identity matches", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "creator-uuid", tags: [], megaphoneState: false },
        });

        await expect(
            processProximityPollMetadata("proximityPoll:poll-1", createPollDefinition(), "space-user-1", space),
        ).resolves.toMatchObject({ id: "poll-1" });
    });

    it("should reject metadata keys that do not match the payload", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "creator-uuid", tags: [], megaphoneState: false },
        });

        await expect(
            processProximityPollMetadata("proximityPoll:spoofed-poll", createPollDefinition(), "space-user-1", space),
        ).rejects.toThrow("Poll metadata key does not match payload");
    });

    it("should reject votes whose voter does not match the metadata sender", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "alice-uuid", tags: [], megaphoneState: false },
            metadata: new Map([["proximityPoll:poll-1", createPollDefinition()]]),
        });

        await expect(
            processProximityPollMetadata(
                "proximityPollVote:poll-1:bob-uuid",
                { pollId: "poll-1", voterId: "bob-uuid", answerIds: ["answer-1"], updatedAt: 11 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Poll vote voter does not match metadata sender");
    });

    it("should only allow poll creators to end and delete their poll", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "other-uuid", tags: ["admin"], megaphoneState: true },
            metadata: new Map([["proximityPoll:poll-1", createPollDefinition()]]),
        });

        await expect(
            processProximityPollMetadata(
                "proximityPollEnd:poll-1",
                { pollId: "poll-1", senderId: "other-uuid", closedAt: 12 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Only poll creators can close a poll");
        await expect(
            processProximityPollMetadata(
                "proximityPollDelete:poll-1",
                { pollId: "poll-1", senderId: "other-uuid", deletedAt: 13 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Only poll creators can delete a poll");
    });
});

function createPollDefinition() {
    return {
        id: "poll-1",
        question: "Which option?",
        kind: "closed",
        answers: [
            { id: "answer-1", text: "First" },
            { id: "answer-2", text: "Second" },
        ],
        maxSelections: 1,
        senderId: "creator-uuid",
        senderName: "Creator",
        createdAt: 10,
    };
}

function createSpace({
    sender,
    metadata = new Map<string, unknown>(),
}: {
    sender: { spaceUserId: string; uuid?: string; tags: string[]; megaphoneState: boolean };
    metadata?: Map<string, unknown>;
}) {
    return {
        getUser: (spaceUserId: string) => (spaceUserId === sender.spaceUserId ? sender : undefined),
        getMetadataValue: (key: string) => metadata.get(key),
    };
}
