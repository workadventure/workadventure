import { describe, expect, it, vi } from "vitest";
import type { Room, RoomMember } from "matrix-js-sdk";
import { chatUserFactoryFromRoom } from "../MatrixChatUser";

vi.mock("../services/MatrixAvatarProfile", () => ({ matrixAvatarProfile: {} }));

const USER_ID = "@old-sender:matrix.example.com";

function createMember(name: string): RoomMember {
    return { userId: USER_ID, name, getAvatarUrl: () => null } as unknown as RoomMember;
}

function createRoom(currentMember: RoomMember | null): Room {
    return {
        client: { getUser: () => null, baseUrl: "https://matrix.example.com" },
        getMember: () => currentMember,
    } as unknown as Room;
}

describe("chatUserFactoryFromRoom", () => {
    // With lazy-loaded members, a sender who only appears in older history is not in the current state.
    it("falls back on the event sender when the current state does not know the member", () => {
        const user = chatUserFactoryFromRoom(createRoom(null), USER_ID, createMember("Old Sender Name"));

        expect(user?.username).toBe("Old Sender Name");
    });

    it("prefers the current member over the event sender", () => {
        const user = chatUserFactoryFromRoom(
            createRoom(createMember("New Name")),
            USER_ID,
            createMember("Name At The Time"),
        );

        expect(user?.username).toBe("New Name");
    });

    it("returns undefined when the sender is known nowhere", () => {
        expect(chatUserFactoryFromRoom(createRoom(null), USER_ID)).toBeUndefined();
    });
});
