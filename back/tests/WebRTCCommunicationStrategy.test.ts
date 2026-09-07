import { describe, expect, it, vi } from "vitest";
import { MeetingConnectionRestartMessage, SpaceUser } from "@workadventure/messages";
import { WebRTCCommunicationStrategy } from "../src/Model/Strategies/WebRTCCommunicationStrategy";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";

interface WebRtcStartDispatch {
    receiverUserId: string;
    senderUserId: string;
    spaceEvent: {
        event: {
            $case: string;
            webRtcStartMessage?: { userId: string; initiator: boolean; connectionId: string };
        };
    };
}

function createUser(spaceUserId: string): SpaceUser {
    return SpaceUser.fromPartial({
        spaceUserId,
        uuid: `uuid-${spaceUserId}`,
        name: spaceUserId,
    });
}

function createSpace(dispatchPrivateEvent = vi.fn(), usersInSpace: SpaceUser[] = []): ICommunicationSpace {
    return {
        getAllUsers: () => usersInSpace,
        getUsersInFilter: () => [],
        getUsersToNotify: () => [],
        getRecordingState: () => ({ isRecording: false }),
        dispatchPrivateEvent,
        dispatchPublicEvent: vi.fn(),
        getSpaceName: () => "test-space",
        getPropertiesToSync: () => [],
        publishMetadata: vi.fn(),
        stopRecordingByServer: vi.fn().mockResolvedValue(undefined),
        getUser: (spaceUserId: string) => usersInSpace.find((user) => user.spaceUserId === spaceUserId),
    } as unknown as ICommunicationSpace;
}

function webRtcDisconnectDispatches(dispatchPrivateEvent: ReturnType<typeof vi.fn>): WebRtcStartDispatch[] {
    return dispatchPrivateEvent.mock.calls
        .map((call) => call[0] as WebRtcStartDispatch)
        .filter((event) => event.spaceEvent.event.$case === "webRtcDisconnectMessage");
}

function webRtcStartDispatches(dispatchPrivateEvent: ReturnType<typeof vi.fn>): WebRtcStartDispatch[] {
    return dispatchPrivateEvent.mock.calls
        .map((call) => call[0] as WebRtcStartDispatch)
        .filter((event) => event.spaceEvent.event.$case === "webRtcStartMessage");
}

/**
 * Establishes a single WebRTC connection between user-a and user-b and returns the strategy,
 * the dispatch mock (cleared) and the real connectionId the strategy generated for that connection.
 */
async function setupStrategyWithConnection() {
    const dispatchPrivateEvent = vi.fn();
    const userA = createUser("user-a");
    const userB = createUser("user-b");
    const usersInSpace = [userA, userB];
    const space = createSpace(dispatchPrivateEvent, usersInSpace);
    const users = new Map([
        [userA.spaceUserId, userA],
        [userB.spaceUserId, userB],
    ]);

    const strategy = new WebRTCCommunicationStrategy(space, users, users);
    await strategy.initialize(users, users);

    const starts = webRtcStartDispatches(dispatchPrivateEvent);
    const connectionId = starts[0]?.spaceEvent.event.webRtcStartMessage?.connectionId;
    if (!connectionId) {
        throw new Error("Test setup failed: no WebRTC connection was established");
    }

    dispatchPrivateEvent.mockClear();

    return { strategy, dispatchPrivateEvent, connectionId, userA, userB, usersInSpace };
}

describe("WebRTCCommunicationStrategy.handleMeetingConnectionRestartMessage", () => {
    it("establishes exactly one bidirectional connection on initialize", async () => {
        const { connectionId } = await setupStrategyWithConnection();
        expect(connectionId).toBeTruthy();
    });

    it("regenerates a fresh connection when the restart references the current connection", async () => {
        const { strategy, dispatchPrivateEvent, connectionId } = await setupStrategyWithConnection();

        strategy.handleMeetingConnectionRestartMessage(
            MeetingConnectionRestartMessage.fromPartial({ userId: "user-b", connectionId }),
            "user-a",
        );

        const starts = webRtcStartDispatches(dispatchPrivateEvent);
        expect(starts).toHaveLength(2);

        const newIds = starts.map((start) => start.spaceEvent.event.webRtcStartMessage?.connectionId);
        // Both starts share a single new id, different from the superseded one.
        expect(new Set(newIds).size).toBe(1);
        expect(newIds[0]).not.toBe(connectionId);

        // One peer is the initiator, the other is not.
        const initiators = starts.map((start) => start.spaceEvent.event.webRtcStartMessage?.initiator);
        expect(initiators).toContain(true);
        expect(initiators).toContain(false);
    });

    it("ignores a stale restart that references a superseded connection", async () => {
        const { strategy, dispatchPrivateEvent } = await setupStrategyWithConnection();

        strategy.handleMeetingConnectionRestartMessage(
            MeetingConnectionRestartMessage.fromPartial({ userId: "user-b", connectionId: "stale-connection-id" }),
            "user-a",
        );

        expect(dispatchPrivateEvent).not.toHaveBeenCalled();
    });

    it("regenerates when the restart omits the connectionId (backward compatibility)", async () => {
        const { strategy, dispatchPrivateEvent } = await setupStrategyWithConnection();

        strategy.handleMeetingConnectionRestartMessage(
            MeetingConnectionRestartMessage.fromPartial({ userId: "user-b" }),
            "user-a",
        );

        expect(webRtcStartDispatches(dispatchPrivateEvent)).toHaveLength(2);
    });

    it("ignores a restart when no connection exists between the peers", () => {
        const dispatchPrivateEvent = vi.fn();
        const space = createSpace(dispatchPrivateEvent);
        const strategy = new WebRTCCommunicationStrategy(space, new Map(), new Map());

        strategy.handleMeetingConnectionRestartMessage(
            MeetingConnectionRestartMessage.fromPartial({ userId: "user-b", connectionId: "any-connection-id" }),
            "user-a",
        );

        expect(dispatchPrivateEvent).not.toHaveBeenCalled();
    });

    it("ignores a restart without a target userId", async () => {
        const { strategy, dispatchPrivateEvent } = await setupStrategyWithConnection();

        strategy.handleMeetingConnectionRestartMessage(MeetingConnectionRestartMessage.fromPartial({}), "user-a");

        expect(dispatchPrivateEvent).not.toHaveBeenCalled();
    });
});

describe("WebRTCCommunicationStrategy disconnect teardown", () => {
    it("sends one disconnect per direction of a tracked connection, and nothing on a repeated teardown", async () => {
        const { strategy, dispatchPrivateEvent, userA } = await setupStrategyWithConnection();

        strategy.deleteUserFromNotify(userA);

        const disconnects = webRtcDisconnectDispatches(dispatchPrivateEvent);
        expect(disconnects.map((event) => [event.senderUserId, event.receiverUserId])).toEqual([
            ["user-a", "user-b"],
            ["user-b", "user-a"],
        ]);

        dispatchPrivateEvent.mockClear();
        // A duplicate delete-to-notify (e.g. an explicit leave overlapping with the socket close) has nothing
        // left to tear down: it must not spam the remaining peers with disconnects.
        strategy.deleteUserFromNotify(userA);
        expect(dispatchPrivateEvent).not.toHaveBeenCalled();
    });

    it("does not dispatch on behalf of a sender that already left the space", async () => {
        const { strategy, dispatchPrivateEvent, userA, usersInSpace } = await setupStrategyWithConnection();
        // user-a was removed from the space before its delete-to-notify arrived (Sentry BACK-2B).
        usersInSpace.splice(usersInSpace.indexOf(userA), 1);

        expect(() => strategy.deleteUserFromNotify(userA)).not.toThrow();

        const disconnects = webRtcDisconnectDispatches(dispatchPrivateEvent);
        // Only the direction whose sender is still in the space is dispatched.
        expect(disconnects.map((event) => [event.senderUserId, event.receiverUserId])).toEqual([["user-b", "user-a"]]);
    });
});
