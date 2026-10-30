import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
// The states and CommunicationManager import each other: load them in the order the back does, from the manager.
import "../src/Model/CommunicationManager";
import { WebRTCState } from "../src/Model/States/WebRTCState";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";

interface Dispatch {
    receiverUserId: string;
    spaceEvent: { event: { $case: string } };
}

function createUser(spaceUserId: string): SpaceUser {
    return SpaceUser.fromPartial({ spaceUserId, uuid: `uuid-${spaceUserId}`, name: spaceUserId });
}

function createSpace(dispatchPrivateEvent: ReturnType<typeof vi.fn>, usersInSpace: SpaceUser[]): ICommunicationSpace {
    return {
        getAllUsers: () => usersInSpace,
        dispatchPrivateEvent,
        dispatchPublicEvent: vi.fn(),
        getSpaceName: () => "test-space",
        getUser: (spaceUserId: string) => usersInSpace.find((user) => user.spaceUserId === spaceUserId),
    } as unknown as ICommunicationSpace;
}

/** The cases each user received, in order. */
function receivedBy(dispatchPrivateEvent: ReturnType<typeof vi.fn>, spaceUserId: string): string[] {
    return dispatchPrivateEvent.mock.calls
        .map((call) => call[0] as Dispatch)
        .filter((event) => event.receiverUserId === spaceUserId)
        .map((event) => event.spaceEvent.event.$case);
}

function setup() {
    const dispatchPrivateEvent = vi.fn();
    const alice = createUser("alice");
    const bob = createUser("bob");
    const users = new Map<string, SpaceUser>();
    const usersToNotify = new Map<string, SpaceUser>();
    const state = new WebRTCState(createSpace(dispatchPrivateEvent, [alice, bob]), users, usersToNotify);
    return { dispatchPrivateEvent, alice, bob, users, usersToNotify, state };
}

describe("WebRTCState", () => {
    it("tells a peer the strategy before its WebRTC start, when both entered the registries before either was handled", async () => {
        // What a join burst looks like after the transition lock: both users already sit in both registries
        // (the manager fills them before waiting), then the handlers run one after the other.
        const { dispatchPrivateEvent, alice, bob, users, usersToNotify, state } = setup();
        await state.init();
        for (const user of [alice, bob]) {
            users.set(user.spaceUserId, user);
            usersToNotify.set(user.spaceUserId, user);
        }

        await state.handleUserAdded(alice);
        await state.handleUserToNotifyAdded(alice);
        await state.handleUserAdded(bob);
        await state.handleUserToNotifyAdded(bob);

        for (const user of [alice, bob]) {
            const received = receivedBy(dispatchPrivateEvent, user.spaceUserId);
            expect(received[0]).toBe("switchMessage");
            expect(received.filter((c) => c === "switchMessage")).toHaveLength(1);
            expect(received).toContain("webRtcStartMessage");
        }
    });

    it("tells the strategy once to a user entering the registries one at a time", async () => {
        const { dispatchPrivateEvent, alice, users, usersToNotify, state } = setup();
        await state.init();

        users.set(alice.spaceUserId, alice);
        await state.handleUserAdded(alice);
        usersToNotify.set(alice.spaceUserId, alice);
        await state.handleUserToNotifyAdded(alice);

        expect(receivedBy(dispatchPrivateEvent, "alice")).toEqual(["switchMessage"]);
    });

    it("tells a user again after they left both registries and came back", async () => {
        const { dispatchPrivateEvent, alice, users, state } = setup();
        await state.init();
        users.set(alice.spaceUserId, alice);
        await state.handleUserAdded(alice);

        users.delete(alice.spaceUserId);
        await state.handleUserDeleted(alice);
        users.set(alice.spaceUserId, alice);
        await state.handleUserAdded(alice);

        expect(receivedBy(dispatchPrivateEvent, "alice")).toEqual(["switchMessage", "switchMessage"]);
    });

    it("does not tell again the users the previous state switched over", async () => {
        // A transition: the old state's switchState() told everyone in the registries, then the new state's init()
        const { dispatchPrivateEvent, alice, bob, users, usersToNotify, state } = setup();
        users.set(alice.spaceUserId, alice);
        usersToNotify.set(alice.spaceUserId, alice);
        await state.init();

        users.set(bob.spaceUserId, bob);
        await state.handleUserAdded(bob);

        expect(receivedBy(dispatchPrivateEvent, "alice")).not.toContain("switchMessage");
        expect(receivedBy(dispatchPrivateEvent, "bob")).toEqual(["switchMessage"]);
    });
});
