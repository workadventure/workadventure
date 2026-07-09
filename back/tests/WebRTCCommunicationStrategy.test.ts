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

function createSpace(dispatchPrivateEvent = vi.fn()): ICommunicationSpace {
    return {
        getAllUsers: () => [],
        getUsersInFilter: () => [],
        getUsersToNotify: () => [],
        getRecordingState: () => ({ isRecording: false }),
        dispatchPrivateEvent,
        dispatchPublicEvent: vi.fn(),
        getSpaceName: () => "test-space",
        getPropertiesToSync: () => [],
        publishMetadata: vi.fn(),
        stopRecordingByServer: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn(),
    } as unknown as ICommunicationSpace;
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
    const space = createSpace(dispatchPrivateEvent);
    const userA = createUser("user-a");
    const userB = createUser("user-b");
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

    return { strategy, dispatchPrivateEvent, connectionId };
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

    it("ignores a restart when no connection exists between the peers", async () => {
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
