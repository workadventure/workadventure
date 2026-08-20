import { get, readable } from "svelte/store";
import { describe, expect, it } from "vitest";
import { MapStore } from "@workadventure/store-utils";
import type { ChatMessage, ChatPollItem, ChatQuestionItem } from "../../ChatConnection";
import { createProximityTimelineItemsStore } from "../ProximityTimelineItemsStore";

describe("ProximityTimelineItemsStore", () => {
    it("should merge messages and polls by date", () => {
        const messages = readable<readonly ChatMessage[]>([
            createMessage("message-1", new Date(20), "proximity"),
            createMessage("system-1", new Date(30), "incoming"),
        ]);
        const polls = readable<readonly ChatPollItem[]>([createPoll("poll-1", new Date(10))]);

        const timelineItems = get(createProximityTimelineItemsStore(messages, polls));

        expect(timelineItems.map((item) => item.id)).toEqual(["poll-1", "message-1", "system-1"]);
        expect(timelineItems.map((item) => item.kind)).toEqual(["poll", "message", "system"]);
    });

    it("should interleave questions with messages and polls by date", () => {
        const messages = readable<readonly ChatMessage[]>([createMessage("message-1", new Date(20), "proximity")]);
        const polls = readable<readonly ChatPollItem[]>([createPoll("poll-1", new Date(30))]);
        const questions = readable<readonly ChatQuestionItem[]>([
            createQuestion("question-1", new Date(10)),
            createQuestion("question-2", new Date(40)),
        ]);

        const timelineItems = get(createProximityTimelineItemsStore(messages, polls, questions));

        expect(timelineItems.map((item) => item.id)).toEqual(["question-1", "message-1", "poll-1", "question-2"]);
        expect(timelineItems.map((item) => item.kind)).toEqual(["question", "message", "poll", "question"]);
    });

    it("should default to no questions when the store is omitted", () => {
        const messages = readable<readonly ChatMessage[]>([createMessage("message-1", new Date(20), "proximity")]);

        const timelineItems = get(createProximityTimelineItemsStore(messages));

        expect(timelineItems.map((item) => item.kind)).toEqual(["message"]);
    });
});

function createMessage(id: string, date: Date, type: ChatMessage["type"]): ChatMessage {
    return {
        id,
        date,
        type,
        sender: undefined,
        content: readable({ body: id, url: undefined }),
        isMyMessage: false,
        isQuotedMessage: undefined,
        quotedMessage: undefined,
        reactions: new MapStore(),
        remove: () => {},
        edit: () => Promise.resolve(),
        isDeleted: readable(false),
        isModified: readable(false),
        canEdit: readable(false),
        addReaction: () => Promise.resolve(),
        canReact: readable(false),
        canDelete: readable(false),
    };
}

function createPoll(id: string, date: Date): ChatPollItem {
    return {
        id,
        date,
        sender: undefined,
        context: { kind: "room" },
        state: readable({
            question: "Best fruit?",
            kind: "open",
            answers: [],
            maxSelections: 1,
            isEnded: false,
            hasVoted: false,
            myAnswerIds: [],
            resultsVisible: false,
            totalVotes: 0,
            spoiledVotes: 0,
            undecryptableRelationsCount: 0,
        }),
        canVote: readable(true),
        canEnd: readable(false),
        canDelete: readable(false),
        vote: () => Promise.resolve(),
        end: () => Promise.resolve(),
        remove: () => Promise.resolve(),
    };
}

function createQuestion(id: string, date: Date): ChatQuestionItem {
    return {
        id,
        date,
        sender: undefined,
        state: readable({
            id,
            body: id,
            senderId: "sender",
            senderName: undefined,
            createdAt: date.getTime(),
            isAnswered: false,
            upvoteCount: 0,
            hasUpvoted: false,
            canUpvote: true,
            canDelete: false,
            canMarkAnswered: false,
        }),
        canUpvote: readable(true),
        canDelete: readable(false),
        canMarkAnswered: readable(false),
        toggleUpvote: () => Promise.resolve(),
        remove: () => Promise.resolve(),
        markAnswered: () => Promise.resolve(),
    };
}
