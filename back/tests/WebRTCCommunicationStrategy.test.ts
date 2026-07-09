import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import type { PrivateEvent } from "@workadventure/messages";
import { WebRTCCommunicationStrategy } from "../src/Model/Strategies/WebRTCCommunicationStrategy";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";

function createUser(spaceUserId: string): SpaceUser {
    return SpaceUser.fromPartial({
        spaceUserId,
        uuid: `uuid-${spaceUserId}`,
        name: spaceUserId,
    });
}

function createSpace(dispatchPrivateEvent: (event: PrivateEvent) => void): ICommunicationSpace {
    return {
        getAllUsers: () => [],
        getUsersInFilter: () => [],
        getUsersToNotify: () => [],
        getRecordingState: () => ({ isRecording: false, recorder: "", status: "idle" }),
        dispatchPrivateEvent,
        dispatchPublicEvent: vi.fn(),
        getSpaceName: () => "test-space",
        getPropertiesToSync: () => [],
        publishMetadata: vi.fn(),
        stopRecordingByServer: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn(),
    } as unknown as ICommunicationSpace;
}

function eventsOfCase(
    dispatch: ReturnType<typeof vi.fn>,
    $case: "webRtcStartMessage" | "webRtcDisconnectMessage",
): PrivateEvent[] {
    return dispatch.mock.calls
        .map((call) => call[0] as PrivateEvent)
        .filter((event) => event.spaceEvent?.event?.$case === $case);
}

describe("WebRTCCommunicationStrategy", () => {
    it("does not send webRtcStart to existing speakers when a listener becomes a speaker", async () => {
        // Regression test for PR #5868: when a listener becomes a speaker, addUser() must only
        // wire the new speaker to pure listeners. Connections between speakers are already handled
        // by addUserToNotify(), so re-establishing them here would send a duplicate offer.
        const dispatchPrivateEvent = vi.fn();
        const space = createSpace(dispatchPrivateEvent);

        const speaker = createUser("speaker-1"); // already a speaker
        const listener = createUser("listener-1"); // pure listener
        const newSpeaker = createUser("new-speaker"); // was a listener, now added to the filter

        // userRegistry.addUser() adds the user to the filter *before* strategy.addUser() runs,
        // so `users` already contains the new speaker.
        const users = new Map<string, SpaceUser>([
            [speaker.spaceUserId, speaker],
            [newSpeaker.spaceUserId, newSpeaker],
        ]);
        const usersToNotify = new Map<string, SpaceUser>([
            [speaker.spaceUserId, speaker],
            [listener.spaceUserId, listener],
            [newSpeaker.spaceUserId, newSpeaker],
        ]);

        const strategy = new WebRTCCommunicationStrategy(space, users, usersToNotify);
        await strategy.addUser(newSpeaker);

        const involvedUsers = new Set(
            eventsOfCase(dispatchPrivateEvent, "webRtcStartMessage").flatMap((event) => [
                event.senderUserId,
                event.receiverUserId,
            ]),
        );

        // The existing speaker must never be part of a webRtcStart triggered by addUser().
        expect(involvedUsers.has(speaker.spaceUserId)).toBe(false);
        // The pure listener must still be connected to the new speaker.
        expect(involvedUsers.has(listener.spaceUserId)).toBe(true);
    });

    it("does not shut down a connection with the leaving user itself in deleteUser", () => {
        // Regression test for PR #5868: deleteUser() must skip the leaving user when iterating
        // usersToNotify, otherwise it sends a webRtcDisconnect from the user to themselves.
        const dispatchPrivateEvent = vi.fn();
        const space = createSpace(dispatchPrivateEvent);

        const leaving = createUser("leaving"); // stops being a speaker but is still a listener
        const listener = createUser("listener-1");

        // userRegistry.deleteUser() removes the user from the filter *before* strategy.deleteUser()
        // runs, so `users` no longer contains the leaving user.
        const users = new Map<string, SpaceUser>();
        const usersToNotify = new Map<string, SpaceUser>([
            [leaving.spaceUserId, leaving],
            [listener.spaceUserId, listener],
        ]);

        const strategy = new WebRTCCommunicationStrategy(space, users, usersToNotify);
        strategy.deleteUser(leaving);

        const disconnects = eventsOfCase(dispatchPrivateEvent, "webRtcDisconnectMessage");

        const selfDisconnect = disconnects.some(
            (event) => event.senderUserId === leaving.spaceUserId && event.receiverUserId === leaving.spaceUserId,
        );
        expect(selfDisconnect).toBe(false);

        // The connection with the remaining listener must still be torn down.
        const listenerDisconnect = disconnects.some(
            (event) =>
                (event.senderUserId === leaving.spaceUserId && event.receiverUserId === listener.spaceUserId) ||
                (event.senderUserId === listener.spaceUserId && event.receiverUserId === leaving.spaceUserId),
        );
        expect(listenerDisconnect).toBe(true);
    });
});
