import { describe, expect, it } from "vitest";
import type { ProximityPollDefinitionMetadata, StoredSpaceMetadata } from "@workadventure/shared-utils";
import { parseStoredSpaceMetadata } from "@workadventure/shared-utils";
import {
    processProximityPollDefinitionMetadata,
    processProximityPollDeleteMetadata,
    processProximityPollEndMetadata,
    processProximityPollVoteMetadata,
} from "../src/Model/ProximityPollMetadataProcessor";

describe("ProximityPollMetadataProcessor", () => {
    it("should accept poll creation when sender identity matches", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "creator-uuid", tags: [], megaphoneState: false },
        });

        await expect(
            processProximityPollDefinitionMetadata(
                "proximityPoll:poll-1",
                createPollDefinition(),
                "space-user-1",
                space,
            ),
        ).resolves.toMatchObject({ id: "poll-1" });
    });

    it("should reject metadata keys that do not match the payload", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "creator-uuid", tags: [], megaphoneState: false },
        });

        await expect(
            processProximityPollDefinitionMetadata(
                "proximityPoll:spoofed-poll",
                createPollDefinition(),
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Poll metadata key does not match payload");
    });

    it("should reject votes whose voter does not match the metadata sender", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "alice-uuid", tags: [], megaphoneState: false },
            metadata: new Map([["proximityPoll:poll-1", createPollDefinition()]]),
        });

        await expect(
            processProximityPollVoteMetadata(
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
            processProximityPollEndMetadata(
                "proximityPollEnd:poll-1",
                { pollId: "poll-1", senderId: "other-uuid", closedAt: 12 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Only poll creators can close a poll");
        await expect(
            processProximityPollDeleteMetadata(
                "proximityPollDelete:poll-1",
                { pollId: "poll-1", senderId: "other-uuid", deletedAt: 13 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Only poll creators can delete a poll");
    });

    it("should allow the poll creator to end and delete using their other identifier", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "creator-uuid", tags: [], megaphoneState: false },
            metadata: new Map([["proximityPoll:poll-1", createPollDefinition()]]),
        });

        // The poll was stored with the creator's uuid, but the creator acts with their spaceUserId.
        await expect(
            processProximityPollEndMetadata(
                "proximityPollEnd:poll-1",
                { pollId: "poll-1", senderId: "space-user-1", closedAt: 12 },
                "space-user-1",
                space,
            ),
        ).resolves.toMatchObject({ pollId: "poll-1" });
        await expect(
            processProximityPollDeleteMetadata(
                "proximityPollDelete:poll-1",
                { pollId: "poll-1", senderId: "space-user-1", deletedAt: 13 },
                "space-user-1",
                space,
            ),
        ).resolves.toMatchObject({ pollId: "poll-1" });
    });

    it("should reject votes that select more answers than the poll allows", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "alice-uuid", tags: [], megaphoneState: false },
            metadata: new Map([["proximityPoll:poll-1", createPollDefinition()]]),
        });

        await expect(
            processProximityPollVoteMetadata(
                "proximityPollVote:poll-1:alice-uuid",
                { pollId: "poll-1", voterId: "alice-uuid", answerIds: ["answer-1", "answer-2"], updatedAt: 11 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Poll vote selects more answers than the poll allows");
    });

    it("should reject votes that reference answers outside the poll", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "alice-uuid", tags: [], megaphoneState: false },
            metadata: new Map([["proximityPoll:poll-1", createPollDefinition()]]),
        });

        await expect(
            processProximityPollVoteMetadata(
                "proximityPollVote:poll-1:alice-uuid",
                { pollId: "poll-1", voterId: "alice-uuid", answerIds: ["unknown-answer"], updatedAt: 11 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Poll vote references answers that do not belong to the poll");
    });
});

function createPollDefinition(): ProximityPollDefinitionMetadata {
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
        // Same catalogue check as the real Space, so the fake cannot hand back a shape the processor
        // could never receive in production.
        getMetadataValue: <K extends string>(key: K): StoredSpaceMetadata<K> | undefined =>
            parseStoredSpaceMetadata(key, metadata.get(key)),
    };
}
