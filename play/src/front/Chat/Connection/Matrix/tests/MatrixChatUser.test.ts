import { describe, expect, it, vi } from "vitest";
import type { MatrixEvent, Room, RoomMember, User } from "matrix-js-sdk";
import { chatUserFactoryFromEvent } from "../MatrixChatUser";

vi.mock("../services/MatrixAvatarProfile", () => ({
    matrixAvatarProfile: { createLazyAvatarStore: () => undefined, resolveUserAvatarUrl: () => undefined },
}));

const USER_ID = "@sender:matrix.example.com";

function createMember(name: string, hasMembershipEvent = true): RoomMember {
    return {
        userId: USER_ID,
        name,
        events: { member: hasMembershipEvent ? {} : undefined },
        getAvatarUrl: () => null,
    } as unknown as RoomMember;
}

function createRoom(currentMember: RoomMember | null, user: Partial<User> | null = null): Room {
    return {
        client: { getUser: () => user, baseUrl: "https://matrix.example.com" },
        getMember: () => currentMember,
    } as unknown as Room;
}

function createEvent(sender: RoomMember | null): MatrixEvent {
    return { sender, getSender: () => USER_ID } as unknown as MatrixEvent;
}

describe("chatUserFactoryFromEvent", () => {
    // Like Element: a later rename does not change older messages.
    it("shows the name the sender had when the event was sent", () => {
        const user = chatUserFactoryFromEvent(
            createRoom(createMember("New Name")),
            createEvent(createMember("Name At The Time")),
        );

        expect(user?.username).toBe("Name At The Time");
    });

    // With lazy-loaded members, a sender who only appears in older history is not in the current state.
    it("uses the event sender when the current state does not know the member", () => {
        const user = chatUserFactoryFromEvent(createRoom(null), createEvent(createMember("Old Sender Name")));

        expect(user?.username).toBe("Old Sender Name");
    });

    // The SDK's sentinel for a member it never saw a membership event for is named after the user ID.
    it("ignores a blank sentinel sender", () => {
        const blankSentinel = createMember(USER_ID, false);

        expect(
            chatUserFactoryFromEvent(createRoom(createMember("Current Name")), createEvent(blankSentinel))?.username,
        ).toBe("Current Name");
        expect(
            chatUserFactoryFromEvent(
                createRoom(null, { userId: USER_ID, displayName: "Profile Name" }),
                createEvent(blankSentinel),
            )?.username,
        ).toBe("Profile Name");
    });

    it("returns undefined when the sender is known nowhere", () => {
        expect(chatUserFactoryFromEvent(createRoom(null), createEvent(null))).toBeUndefined();
    });
});
