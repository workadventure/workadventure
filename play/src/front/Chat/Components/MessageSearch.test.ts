import { readable } from "svelte/store";
import { describe, expect, it } from "vitest";
import type { ChatConversation, ChatMessage, RoomFolder } from "../Connection/ChatConnection";
import { collectFolderRooms, searchLoadedMessages } from "./MessageSearch";

function message(id: string, body: string, minutes: number, isDeleted = false): ChatMessage {
    return {
        id,
        content: readable({ body, url: undefined }),
        isDeleted: readable(isDeleted),
        date: new Date(Date.UTC(2026, 9, 28, 10, minutes)),
    } as unknown as ChatMessage;
}

function room(id: string, messages: ChatMessage[]): ChatConversation {
    return { id, messages: readable(messages) } as unknown as ChatConversation;
}

describe("searchLoadedMessages", () => {
    it("finds a term case-insensitively and splits the text around it", () => {
        const results = searchLoadedMessages(
            [room("r1", [message("m1", "See you at the Standup tomorrow", 1)])],
            "standup",
        );

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ before: "See you at the ", match: "Standup", after: " tomorrow" });
    });

    it("ignores queries shorter than two characters", () => {
        expect(searchLoadedMessages([room("r1", [message("m1", "a b c", 1)])], " a ")).toEqual([]);
    });

    it("skips deleted messages", () => {
        expect(searchLoadedMessages([room("r1", [message("m1", "budget review", 1, true)])], "budget")).toEqual([]);
    });

    it("returns the newest matches first across rooms, capped", () => {
        const results = searchLoadedMessages(
            [
                room("r1", [message("old", "release notes", 1), message("new", "release done", 30)]),
                room("r2", [message("mid", "release plan", 15)]),
            ],
            "release",
            2,
        );

        expect(results.map((result) => result.message.id)).toEqual(["new", "mid"]);
    });

    it("searches a room listed twice only once", () => {
        const shared = room("r1", [message("m1", "design sync", 1)]);

        expect(searchLoadedMessages([shared, shared], "design")).toHaveLength(1);
    });

    it("strips HTML from reply bodies and trims long leading context", () => {
        const body = `<mx-reply>quoted</mx-reply><p>${"x".repeat(50)} the <b>roadmap</b></p>`;
        const [result] = searchLoadedMessages([room("r1", [message("m1", body, 1)])], "roadmap");

        expect(result.match).toBe("roadmap");
        expect(result.before.startsWith("…")).toBe(true);
        expect(result.before).not.toContain("<");
    });
});

describe("collectFolderRooms", () => {
    it("returns the rooms of nested folders, not the folders themselves", () => {
        const inner = { rooms: readable([room("child", [])]), folders: readable([]) } as unknown as RoomFolder;
        const outer = { rooms: readable([room("top", [])]), folders: readable([inner]) } as unknown as RoomFolder;

        expect(collectFolderRooms([outer]).map((conversation) => conversation.id)).toEqual(["top", "child"]);
    });
});
