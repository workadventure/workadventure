import { derived, type Readable } from "svelte/store";
import type { ChatMessage, ChatTimelineItem } from "../ChatConnection";

export function createProximityTimelineItemsStore(
    messages: Readable<readonly ChatMessage[]>
): Readable<readonly ChatTimelineItem[]> {
    return derived([messages], ([$messages]) => {
        return Array.from($messages, (message): ChatTimelineItem => {
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
        });
    });
}
