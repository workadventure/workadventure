import { get } from "svelte/store";
import type { ChatConversation, ChatMessage, RoomFolder } from "../Connection/ChatConnection";

export const MESSAGE_SEARCH_MIN_LENGTH = 2;
export const MESSAGE_SEARCH_MAX_RESULTS = 20;
/** Characters of context kept before the match, so the term stays visible in a one-line row. */
const SNIPPET_LEADING_CONTEXT = 30;

export type MessageSearchResult = {
    room: ChatConversation;
    message: ChatMessage;
    before: string;
    match: string;
    after: string;
};

/**
 * Searches the messages the client already holds, newest first. There is no local index: a message that
 * was never loaded (older history, a room not synced yet) cannot be found.
 */
export function searchLoadedMessages(
    rooms: readonly ChatConversation[],
    query: string,
    maxResults = MESSAGE_SEARCH_MAX_RESULTS,
): MessageSearchResult[] {
    const needle = query.trim().toLocaleLowerCase();
    if (needle.length < MESSAGE_SEARCH_MIN_LENGTH) return [];

    const results: MessageSearchResult[] = [];
    const seenRoomIds = new Set<string>();
    for (const room of rooms) {
        if (seenRoomIds.has(room.id)) continue;
        seenRoomIds.add(room.id);

        for (const message of get(room.messages)) {
            if (get(message.isDeleted)) continue;
            // Replies carry formatted_body (HTML): match and show the text only. Svelte escapes the output.
            const text = get(message.content)
                .body.replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            const lowered = text.toLocaleLowerCase();
            const index = lowered.indexOf(needle);
            if (index === -1) continue;

            // Lowercasing can change the length (e.g. "İ"): slice what was searched so the indexes hold.
            const source = lowered.length === text.length ? text : lowered;
            const start = Math.max(0, index - SNIPPET_LEADING_CONTEXT);
            results.push({
                room,
                message,
                before: (start > 0 ? "…" : "") + source.slice(start, index),
                match: source.slice(index, index + needle.length),
                after: source.slice(index + needle.length),
            });
        }
    }

    return results
        .sort((a, b) => (b.message.date?.getTime() ?? 0) - (a.message.date?.getTime() ?? 0))
        .slice(0, maxResults);
}

/** The rooms of the folders, at every depth: folders are Matrix spaces and hold no messages themselves. */
export function collectFolderRooms(folders: readonly RoomFolder[]): ChatConversation[] {
    return folders.flatMap((folder) => [...get(folder.rooms), ...collectFolderRooms(get(folder.folders))]);
}
