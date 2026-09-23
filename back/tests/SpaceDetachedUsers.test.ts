import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FilterType, SpaceUser } from "@workadventure/messages";
import type { BackToPusherSpaceMessage } from "@workadventure/messages";
import { mock } from "vitest-mock-extended";
import { DETACHED_USER_GRACE_MS, Space } from "../src/Model/Space";
import type { SpacesWatcher } from "../src/Model/SpacesWatcher";
import type { EventProcessor } from "../src/Model/EventProcessor";
import type { ICommunicationManager } from "../src/Model/Interfaces/ICommunicationManager";

// A pusher restarting takes its WebSocket and its gRPC stream to the back with it. These tests pin what the back
// does with the users of such a pusher: keep their place for a while, and give it back to the same tab when it
// reconnects through another pusher.
describe("Space users of a pusher that went away", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    function setup() {
        const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
        const communicationManager = mock<ICommunicationManager>();
        communicationManager.handleUserAdded.mockResolvedValue();
        communicationManager.handleUserDeleted.mockResolvedValue();
        communicationManager.handleUserUpdated.mockResolvedValue();
        communicationManager.handleUserToNotifyAdded.mockResolvedValue();
        communicationManager.handleUserToNotifyDeleted.mockResolvedValue();
        communicationManager.handleRecorderLeftSpace.mockResolvedValue(false);
        (space as unknown as { communicationManager: ICommunicationManager }).communicationManager =
            communicationManager;

        const makeWatcher = (id: string) => {
            const write = vi.fn<(message: BackToPusherSpaceMessage) => void>();
            const watcher = mock<SpacesWatcher>({ id, write });
            space.addWatcher(watcher);
            write.mockClear();
            return { watcher, write };
        };

        return { space, communicationManager, makeWatcher };
    }

    const alice = SpaceUser.fromPartial({ spaceUserId: "room_alice", uuid: "alice", name: "Alice" });
    const bob = SpaceUser.fromPartial({ spaceUserId: "room_bob", uuid: "bob", name: "Bob" });

    const casesSent = (write: ReturnType<typeof vi.fn>) =>
        write.mock.calls.map(([message]) => (message as BackToPusherSpaceMessage).message?.$case);

    it("keeps them present, telling nobody, while the grace period runs", () => {
        const { space, communicationManager, makeWatcher } = setup();
        const dying = makeWatcher("dying");
        const other = makeWatcher("other");
        space.addUser(dying.watcher, alice);
        space.addUserToNotify(dying.watcher, alice);
        space.addUser(other.watcher, bob);
        other.write.mockClear();
        communicationManager.handleUserDeleted.mockClear();

        space.detachWatcher(dying.watcher, vi.fn());

        expect(casesSent(other.write)).not.toContain("removeSpaceUserMessage");
        expect(communicationManager.handleUserDeleted).not.toHaveBeenCalled();
        expect(communicationManager.handleUserToNotifyDeleted).not.toHaveBeenCalled();
    });

    it("is not deleted while a detached user may still come back", () => {
        const { space, makeWatcher } = setup();
        const dying = makeWatcher("dying");
        space.addUser(dying.watcher, alice);

        space.detachWatcher(dying.watcher, vi.fn());

        expect(space.canBeDeleted()).toBe(false);
    });

    it("gives the same tab its place back through another pusher, silently, and has its media signaled again", () => {
        const { space, communicationManager, makeWatcher } = setup();
        const dying = makeWatcher("dying");
        const other = makeWatcher("other");
        space.addUser(dying.watcher, alice);
        space.addUserToNotify(dying.watcher, alice);
        space.addUser(other.watcher, bob);
        space.detachWatcher(dying.watcher, vi.fn());
        other.write.mockClear();
        communicationManager.handleUserAdded.mockClear();
        communicationManager.handleUserToNotifyAdded.mockClear();

        space.addUser(other.watcher, { ...alice });
        expect(communicationManager.handleUserReconnected).not.toHaveBeenCalled();
        space.addUserToNotify(other.watcher, { ...alice });

        expect(casesSent(other.write)).toEqual([]);
        expect(communicationManager.handleUserAdded).not.toHaveBeenCalled();
        expect(communicationManager.handleUserToNotifyAdded).not.toHaveBeenCalled();
        expect(communicationManager.handleUserReconnected).toHaveBeenCalledTimes(1);
        expect(space.getUser("room_alice")).toBeDefined();

        // The grace timer was cancelled: nothing expires later.
        vi.advanceTimersByTime(DETACHED_USER_GRACE_MS);
        expect(casesSent(other.write)).not.toContain("removeSpaceUserMessage");
    });

    it("sends only what changed with the new connection, as an update", () => {
        const { space, makeWatcher } = setup();
        const dying = makeWatcher("dying");
        const other = makeWatcher("other");
        space.addUser(dying.watcher, alice);
        space.detachWatcher(dying.watcher, vi.fn());
        other.write.mockClear();

        space.addUser(other.watcher, { ...alice, name: "Alice B." });

        expect(other.write).toHaveBeenCalledTimes(1);
        const message = other.write.mock.calls[0][0].message;
        expect(message?.$case).toBe("updateSpaceUserMessage");
        if (message?.$case === "updateSpaceUserMessage") {
            expect(message.updateSpaceUserMessage.updateMask).toEqual(["name"]);
        }
    });

    it("keeps the media state it had rather than the blank one of the new registration", () => {
        const { space, makeWatcher } = setup();
        const dying = makeWatcher("dying");
        const other = makeWatcher("other");
        space.addUser(dying.watcher, { ...alice, cameraState: true, microphoneState: true });
        space.detachWatcher(dying.watcher, vi.fn());
        other.write.mockClear();

        space.addUser(other.watcher, { ...alice, cameraState: false, microphoneState: false });

        expect(other.write).not.toHaveBeenCalled();
        expect(space.getUser(alice.spaceUserId)?.cameraState).toBe(true);
    });

    it("lists detached users to a pusher that starts watching meanwhile", () => {
        const { space, makeWatcher } = setup();
        const dying = makeWatcher("dying");
        space.addUser(dying.watcher, alice);
        space.detachWatcher(dying.watcher, vi.fn());

        const latecomer = mock<SpacesWatcher>({ id: "latecomer", write: vi.fn() });
        space.addWatcher(latecomer);

        const message = vi.mocked(latecomer.write).mock.calls[0][0].message;
        expect(message?.$case).toBe("initSpaceUsersMessage");
        if (message?.$case === "initSpaceUsersMessage") {
            expect(message.initSpaceUsersMessage.users.map((u) => u.spaceUserId)).toEqual(["room_alice"]);
        }
    });

    it("lets them leave for good when the grace period runs out", () => {
        const { space, communicationManager, makeWatcher } = setup();
        const dying = makeWatcher("dying");
        const other = makeWatcher("other");
        space.addUser(dying.watcher, alice);
        space.addUserToNotify(dying.watcher, alice);
        const onGraceOver = vi.fn();
        space.detachWatcher(dying.watcher, onGraceOver);
        other.write.mockClear();

        vi.advanceTimersByTime(DETACHED_USER_GRACE_MS);

        expect(casesSent(other.write)).toEqual(["removeSpaceUserMessage"]);
        expect(communicationManager.handleUserDeleted).toHaveBeenCalledWith(alice);
        expect(communicationManager.handleUserToNotifyDeleted).toHaveBeenCalledWith(alice);
        expect(onGraceOver).toHaveBeenCalledTimes(1);
        expect(space.getUser("room_alice")).toBeUndefined();
    });

    it("moves the same tab over from a pusher that is still alive, so its late removal changes nothing", () => {
        const { space, communicationManager, makeWatcher } = setup();
        const oldPusher = makeWatcher("old");
        const newPusher = makeWatcher("new");
        space.addUser(oldPusher.watcher, alice);
        space.addUserToNotify(oldPusher.watcher, alice);
        newPusher.write.mockClear();
        communicationManager.handleUserDeleted.mockClear();

        space.addUser(newPusher.watcher, { ...alice });
        space.addUserToNotify(newPusher.watcher, { ...alice });
        space.removeUser(oldPusher.watcher, alice.spaceUserId);

        expect(casesSent(newPusher.write)).toEqual([]);
        expect(communicationManager.handleUserDeleted).not.toHaveBeenCalled();
        expect(communicationManager.handleUserReconnected).toHaveBeenCalledTimes(1);
        expect(space.getUser(alice.spaceUserId)).toBeDefined();
    });

    it("still removes the users of a pusher that leaves the space explicitly, at once", () => {
        const { space, communicationManager, makeWatcher } = setup();
        const leaving = makeWatcher("leaving");
        const other = makeWatcher("other");
        space.addUser(leaving.watcher, alice);
        other.write.mockClear();

        space.removeWatcher(leaving.watcher);

        expect(casesSent(other.write)).toEqual(["removeSpaceUserMessage"]);
        expect(communicationManager.handleUserDeleted).toHaveBeenCalledWith(alice);
    });
});
