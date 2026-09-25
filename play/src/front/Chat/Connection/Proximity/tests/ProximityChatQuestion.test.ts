import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import type { ProximityQuestion } from "@workadventure/shared-utils";
import { ProximityChatQuestion } from "../ProximityChatQuestion";

describe("ProximityChatQuestion", () => {
    it("should toggle the current user's upvote through the space", async () => {
        const { question, space } = createQuestion({ currentVoterId: "alice-uuid" });

        await question.toggleUpvote();
        expect(space.upvoteQuestion).toHaveBeenLastCalledWith("question-1", true, "alice-uuid");

        question.update({
            question: { ...questionState(), upvotes: { "alice-uuid": 10 } },
            currentVoterId: "alice-uuid",
            sender: undefined,
            canMarkAnswered: false,
            canDeleteAny: false,
        });

        await question.toggleUpvote();
        expect(space.upvoteQuestion).toHaveBeenLastCalledWith("question-1", false, "alice-uuid");
    });

    it("should allow authors and moderators to delete questions", async () => {
        const { question: authorQuestion, space } = createQuestion({ currentVoterId: "author-uuid" });
        const { question: participantQuestion } = createQuestion({ currentVoterId: "alice-uuid", canModerate: false });

        await expect(participantQuestion.remove()).rejects.toThrow("Only question authors or moderators can delete");
        await authorQuestion.remove();

        expect(get(authorQuestion.canDelete)).toBe(true);
        expect(get(participantQuestion.canDelete)).toBe(false);
        expect(space.deleteQuestion).toHaveBeenCalledWith("question-1");
    });

    it("should allow only moderators to mark a question as answered", async () => {
        const { question: moderatorQuestion, space } = createQuestion({
            currentVoterId: "moderator-uuid",
            canMarkAnswered: true,
        });
        const { question: participantQuestion } = createQuestion({
            currentVoterId: "alice-uuid",
            canMarkAnswered: false,
        });

        await expect(participantQuestion.markAnswered()).rejects.toThrow("Only moderators can mark");
        await moderatorQuestion.markAnswered();

        expect(get(moderatorQuestion.canMarkAnswered)).toBe(true);
        expect(get(participantQuestion.canMarkAnswered)).toBe(false);
        expect(space.answerQuestion).toHaveBeenCalledWith("question-1");
    });

    it("should allow speakers to mark answered without allowing them to delete someone else's question", async () => {
        const { question: speakerQuestion, space } = createQuestion({
            currentVoterId: "speaker-uuid",
            canMarkAnswered: true,
            canDeleteAny: false,
        });

        await speakerQuestion.markAnswered();
        await expect(speakerQuestion.remove()).rejects.toThrow("Only question authors or moderators can delete");

        expect(get(speakerQuestion.canMarkAnswered)).toBe(true);
        expect(get(speakerQuestion.canDelete)).toBe(false);
        expect(space.answerQuestion).toHaveBeenCalledWith("question-1");
    });
});

function questionState(): ProximityQuestion {
    return {
        id: "question-1",
        body: "Can we record?",
        senderId: "author-uuid",
        senderName: "Author",
        createdAt: 10,
        upvotes: {},
    };
}

function createQuestion(options: {
    currentVoterId: string;
    canModerate?: boolean;
    canMarkAnswered?: boolean;
    canDeleteAny?: boolean;
}) {
    const space = {
        upvoteQuestion: vi.fn().mockResolvedValue(undefined),
        answerQuestion: vi.fn().mockResolvedValue(undefined),
        deleteQuestion: vi.fn().mockResolvedValue(undefined),
    };

    const question = new ProximityChatQuestion({
        question: questionState(),
        currentVoterId: options.currentVoterId,
        sender: undefined,
        canMarkAnswered: options.canMarkAnswered ?? options.canModerate ?? false,
        canDeleteAny: options.canDeleteAny ?? options.canModerate ?? false,
        space,
    });
    return { question, space };
}
