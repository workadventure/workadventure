import { derived, readable, type Readable } from "svelte/store";
import type { ChatMessage, ChatPollItem, ChatQuestionItem, ChatTimelineItem } from "../ChatConnection";

export function createProximityTimelineItemsStore(
    messages: Readable<readonly ChatMessage[]>,
    polls: Readable<readonly ChatPollItem[]> = readable([]),
    questions: Readable<readonly ChatQuestionItem[]> = readable([]),
): Readable<readonly ChatTimelineItem[]> {
    return derived([messages, polls, questions], ([$messages, $polls, $questions]) => {
        const messageItems = Array.from($messages, mapMessageToTimelineItem);
        const pollItems = Array.from($polls, (poll): ChatTimelineItem => {
            return {
                kind: "poll",
                id: poll.id,
                date: poll.date,
                poll,
            };
        });
        const questionItems = Array.from($questions, (question): ChatTimelineItem => {
            return {
                kind: "question",
                id: question.id,
                date: question.date,
                question,
            };
        });

        return [...messageItems, ...pollItems, ...questionItems].sort(compareTimelineItemsByDate);
    });
}

function mapMessageToTimelineItem(message: ChatMessage): ChatTimelineItem {
    if (message.type === "incoming" || message.type === "outcoming") {
        return {
            kind: "system",
            id: message.id,
            date: message.date,
            message,
        };
    }

    return {
        kind: "message",
        id: message.id,
        date: message.date,
        message,
    };
}

function compareTimelineItemsByDate(left: ChatTimelineItem, right: ChatTimelineItem): number {
    return getTimestamp(left.date) - getTimestamp(right.date);
}

function getTimestamp(date: Date | null): number {
    return date?.getTime() ?? 0;
}
