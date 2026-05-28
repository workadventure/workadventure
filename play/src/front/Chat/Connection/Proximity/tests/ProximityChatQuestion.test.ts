import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import { ProximityChatQuestion } from "../ProximityChatQuestion";
import {
    getProximityQAAnswerMetadataKey,
    getProximityQADeleteMetadataKey,
    getProximityQAUpvoteMetadataKey,
    type ProximityQAQuestionMetadata,
} from "../ProximityQAMetadata";

describe("ProximityChatQuestion", () => {
    it("should toggle the current user's upvote in a dedicated metadata key", async () => {
        const metadataUpdates: Map<string, unknown>[] = [];
        const question = createQuestion({
            currentVoterId: "alice-uuid",
            updateMetadata: (metadata) => metadataUpdates.push(metadata),
        });

        await question.toggleUpvote();

        expect(metadataUpdates[0].get(getProximityQAUpvoteMetadataKey("question-1", "alice-uuid"))).toMatchObject({
            questionId: "question-1",
            voterId: "alice-uuid",
            upvoted: true,
        });

        question.update({
            upvotes: [{ questionId: "question-1", voterId: "alice-uuid", upvoted: true, updatedAt: 10 }],
            answer: undefined,
            currentVoterId: "alice-uuid",
            sender: undefined,
            canMarkAnswered: false,
            canDeleteAny: false,
        });

        await question.toggleUpvote();

        expect(metadataUpdates[1].get(getProximityQAUpvoteMetadataKey("question-1", "alice-uuid"))).toMatchObject({
            questionId: "question-1",
            voterId: "alice-uuid",
            upvoted: false,
        });
    });

    it("should allow authors and moderators to delete questions", async () => {
        const metadataUpdates: Map<string, unknown>[] = [];
        const authorQuestion = createQuestion({
            currentVoterId: "author-uuid",
            updateMetadata: (metadata) => metadataUpdates.push(metadata),
        });
        const participantQuestion = createQuestion({
            currentVoterId: "alice-uuid",
            canModerate: false,
            updateMetadata: (metadata) => metadataUpdates.push(metadata),
        });

        await expect(participantQuestion.remove()).rejects.toThrow("Only question authors or moderators can delete");
        await authorQuestion.remove();

        expect(get(authorQuestion.canDelete)).toBe(true);
        expect(get(participantQuestion.canDelete)).toBe(false);
        expect(metadataUpdates[0].get(getProximityQADeleteMetadataKey("question-1"))).toMatchObject({
            questionId: "question-1",
            senderId: "author-uuid",
        });
    });

    it("should allow only moderators to mark a question as answered", async () => {
        const metadataUpdates: Map<string, unknown>[] = [];
        const moderatorQuestion = createQuestion({
            currentVoterId: "moderator-uuid",
            canMarkAnswered: true,
            updateMetadata: (metadata) => metadataUpdates.push(metadata),
        });
        const participantQuestion = createQuestion({
            currentVoterId: "alice-uuid",
            canMarkAnswered: false,
            updateMetadata: (metadata) => metadataUpdates.push(metadata),
        });

        await expect(participantQuestion.markAnswered()).rejects.toThrow("Only moderators can mark");
        await moderatorQuestion.markAnswered();

        expect(get(moderatorQuestion.canMarkAnswered)).toBe(true);
        expect(get(participantQuestion.canMarkAnswered)).toBe(false);
        expect(metadataUpdates[0].get(getProximityQAAnswerMetadataKey("question-1"))).toMatchObject({
            questionId: "question-1",
            moderatorId: "moderator-uuid",
        });
    });

    it("should allow speakers to mark answered without allowing them to delete someone else's question", async () => {
        const metadataUpdates: Map<string, unknown>[] = [];
        const speakerQuestion = createQuestion({
            currentVoterId: "speaker-uuid",
            canMarkAnswered: true,
            canDeleteAny: false,
            updateMetadata: (metadata) => metadataUpdates.push(metadata),
        });

        await speakerQuestion.markAnswered();
        await expect(speakerQuestion.remove()).rejects.toThrow("Only question authors or moderators can delete");

        expect(get(speakerQuestion.canMarkAnswered)).toBe(true);
        expect(get(speakerQuestion.canDelete)).toBe(false);
        expect(metadataUpdates[0].get(getProximityQAAnswerMetadataKey("question-1"))).toMatchObject({
            questionId: "question-1",
            moderatorId: "speaker-uuid",
        });
    });
});

function createQuestion(options: {
    currentVoterId: string;
    canModerate?: boolean;
    canMarkAnswered?: boolean;
    canDeleteAny?: boolean;
    updateMetadata: (metadata: Map<string, unknown>) => void;
}) {
    const definition: ProximityQAQuestionMetadata = {
        id: "question-1",
        body: "Can we record?",
        senderId: "author-uuid",
        senderName: "Author",
        createdAt: 10,
    };

    return new ProximityChatQuestion({
        definition,
        upvotes: [],
        answer: undefined,
        currentVoterId: options.currentVoterId,
        sender: undefined,
        canMarkAnswered: options.canMarkAnswered ?? options.canModerate ?? false,
        canDeleteAny: options.canDeleteAny ?? options.canModerate ?? false,
        updateMetadata: options.updateMetadata,
    });
}
