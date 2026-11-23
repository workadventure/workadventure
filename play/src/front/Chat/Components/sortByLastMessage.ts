import { derived, readable } from "svelte/store";
import type { Readable } from "svelte/store";
import type { ChatRoom } from "../Connection/ChatConnection";

type Sortable = Pick<ChatRoom, "lastMessageTimestamp" | "lastMessageTimestampStore">;

/** Most recent first, and kept in that order as messages arrive: a sort on the bare timestamp only ran when the list changed. */
export function sortByLastMessage<T extends Sortable>(rooms: readonly T[]): Readable<T[]> {
    return derived(
        rooms.map((room) => room.lastMessageTimestampStore ?? readable(room.lastMessageTimestamp)),
        (timestamps) =>
            rooms
                .map((room, index) => ({ room, timestamp: timestamps[index] }))
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(({ room }) => room),
    );
}
