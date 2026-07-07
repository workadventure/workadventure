import { describe, expect, it } from "vitest";
import { processProximityQAMetadata } from "../src/Model/ProximityQAMetadataProcessor";

describe("ProximityQAMetadataProcessor", () => {
    it("should accept question creation when sender identity matches", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "author-uuid", tags: [], megaphoneState: false },
        });

        await expect(
            processProximityQAMetadata(
                "proximityQaQuestion:question-1",
                {
                    id: "question-1",
                    body: "Can we record?",
                    senderId: "author-uuid",
                    senderName: "Author",
                    createdAt: 10,
                },
                "space-user-1",
                space,
            ),
        ).resolves.toMatchObject({ id: "question-1" });
    });

    it("should reject author self-upvotes", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "author-uuid", tags: [], megaphoneState: false },
            metadata: new Map([
                [
                    "proximityQaQuestion:question-1",
                    {
                        id: "question-1",
                        body: "Can we record?",
                        senderId: "author-uuid",
                        createdAt: 10,
                    },
                ],
            ]),
        });

        await expect(
            processProximityQAMetadata(
                "proximityQaUpvote:question-1:author-uuid",
                { questionId: "question-1", voterId: "author-uuid", upvoted: true, updatedAt: 11 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Question authors cannot upvote their own question");
    });

    it("should reject author self-upvotes made with the author's other identifier", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "author-uuid", tags: [], megaphoneState: false },
            metadata: new Map([
                [
                    "proximityQaQuestion:question-1",
                    {
                        id: "question-1",
                        body: "Can we record?",
                        senderId: "author-uuid",
                        createdAt: 10,
                    },
                ],
            ]),
        });

        // The question was stored with the author's uuid, but the author upvotes with their spaceUserId.
        await expect(
            processProximityQAMetadata(
                "proximityQaUpvote:question-1:space-user-1",
                { questionId: "question-1", voterId: "space-user-1", upvoted: true, updatedAt: 11 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Question authors cannot upvote their own question");
    });

    it("should allow the question author to delete using their other identifier", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "author-uuid", tags: [], megaphoneState: false },
            metadata: new Map([
                [
                    "proximityQaQuestion:question-1",
                    {
                        id: "question-1",
                        body: "Can we record?",
                        senderId: "author-uuid",
                        createdAt: 10,
                    },
                ],
            ]),
        });

        // The question was stored with the author's uuid, but the author deletes with their spaceUserId.
        await expect(
            processProximityQAMetadata(
                "proximityQaDelete:question-1",
                { questionId: "question-1", senderId: "space-user-1", deletedAt: 13 },
                "space-user-1",
                space,
            ),
        ).resolves.toMatchObject({ questionId: "question-1" });
    });

    it("should reject metadata keys that do not match the payload", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "author-uuid", tags: [], megaphoneState: false },
        });

        await expect(
            processProximityQAMetadata(
                "proximityQaQuestion:spoofed-question",
                {
                    id: "question-1",
                    body: "Can we record?",
                    senderId: "author-uuid",
                    createdAt: 10,
                },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Question metadata key does not match payload");
    });

    it("should allow moderators to answer and delete any question", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "moderator-uuid", tags: ["admin"], megaphoneState: false },
            metadata: new Map([
                [
                    "proximityQaQuestion:question-1",
                    {
                        id: "question-1",
                        body: "Can we record?",
                        senderId: "author-uuid",
                        createdAt: 10,
                    },
                ],
            ]),
        });

        await expect(
            processProximityQAMetadata(
                "proximityQaAnswer:question-1",
                { questionId: "question-1", moderatorId: "moderator-uuid", answeredAt: 12 },
                "space-user-1",
                space,
            ),
        ).resolves.toMatchObject({ questionId: "question-1" });
        await expect(
            processProximityQAMetadata(
                "proximityQaDelete:question-1",
                { questionId: "question-1", senderId: "moderator-uuid", deletedAt: 13 },
                "space-user-1",
                space,
            ),
        ).resolves.toMatchObject({ questionId: "question-1" });
    });

    it("should allow runtime speakers to answer without allowing them to delete someone else's question", async () => {
        const space = createSpace({
            sender: { spaceUserId: "space-user-1", uuid: "speaker-uuid", tags: [], megaphoneState: true },
            metadata: new Map([
                [
                    "proximityQaQuestion:question-1",
                    {
                        id: "question-1",
                        body: "Can we record?",
                        senderId: "author-uuid",
                        createdAt: 10,
                    },
                ],
            ]),
        });

        await expect(
            processProximityQAMetadata(
                "proximityQaAnswer:question-1",
                { questionId: "question-1", moderatorId: "speaker-uuid", answeredAt: 12 },
                "space-user-1",
                space,
            ),
        ).resolves.toMatchObject({ questionId: "question-1" });
        await expect(
            processProximityQAMetadata(
                "proximityQaDelete:question-1",
                { questionId: "question-1", senderId: "speaker-uuid", deletedAt: 13 },
                "space-user-1",
                space,
            ),
        ).rejects.toThrow("Only question authors or admins can delete a question");
    });
});

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
