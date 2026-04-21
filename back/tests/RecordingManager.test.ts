import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { RecordingManager } from "../src/Model/RecordingManager";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";
import type { IRecordableState } from "../src/Model/Interfaces/ICommunicationState";
import type { IRecordableStrategy } from "../src/Model/Interfaces/ICommunicationStrategy";
import { CommunicationType } from "../src/Model/Types/CommunicationTypes";
import type { ITransitionOrchestrator } from "../src/Model/Interfaces/ITransitionOrchestrator";
import type { IUserRegistry } from "../src/Model/Interfaces/IUserRegistry";
import type { IStateLifecycleManager } from "../src/Model/Interfaces/IStateLifecycleManager";

function createUser(spaceUserId: string): SpaceUser {
    return SpaceUser.fromPartial({
        spaceUserId,
        uuid: `uuid-${spaceUserId}`,
        name: `User ${spaceUserId}`,
        playUri: "https://play.test",
    });
}

function createRecordableState() {
    type StartRecordingResult = { egressId: string; roomName: string };
    const mocks = {
        handleStartRecording: vi
            .fn<(user: SpaceUser, recordingSessionId: string) => Promise<StartRecordingResult>>()
            .mockResolvedValue({ egressId: "egress-1", roomName: "test-space" }),
        handleStopRecording: vi.fn().mockResolvedValue(undefined),
    };

    const state: IRecordableState<IRecordableStrategy> = {
        communicationType: CommunicationType.LIVEKIT,
        init: vi.fn().mockResolvedValue(undefined),
        finalize: vi.fn(),
        switchState: vi.fn(),
        handleUserAdded: vi.fn().mockResolvedValue(undefined),
        handleUserDeleted: vi.fn().mockResolvedValue(undefined),
        handleUserUpdated: vi.fn().mockResolvedValue(undefined),
        handleUserToNotifyAdded: vi.fn().mockResolvedValue(undefined),
        handleUserToNotifyDeleted: vi.fn().mockResolvedValue(undefined),
        handleMeetingConnectionRestartMessage: vi.fn(),
        handleStartRecording: mocks.handleStartRecording,
        handleStopRecording: mocks.handleStopRecording,
    };

    return { state, mocks };
}

function createDependencies(state: IRecordableState<IRecordableStrategy>) {
    const publishMetadata = vi.fn();
    const space: ICommunicationSpace = {
        getAllUsers: () => [],
        getUsersInFilter: () => [],
        getUsersToNotify: () => [],
        getRecordingState: () => ({ isRecording: false, recorder: null, status: "idle" }),
        dispatchPrivateEvent: vi.fn(),
        dispatchPublicEvent: vi.fn(),
        getSpaceName: () => "test-space",
        getPropertiesToSync: () => ["cameraState", "microphoneState"],
        publishMetadata,
        stopRecordingByServer: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn(),
    };
    const orchestrator: ITransitionOrchestrator = {
        executeImmediateTransition: vi.fn().mockResolvedValue(state),
        scheduleDelayedTransition: vi.fn().mockReturnValue({ abortController: new AbortController() }),
        cancelPendingTransition: vi.fn(),
        hasPendingTransition: vi.fn().mockReturnValue(false),
        waitForTransitionLock: vi.fn().mockResolvedValue(undefined),
        setTransitionLock: vi.fn(),
        clearTransitionLock: vi.fn(),
        dispose: vi.fn(),
    };
    const userRegistry: IUserRegistry = {
        addUser: vi.fn(),
        deleteUser: vi.fn(),
        hasUser: vi.fn().mockReturnValue(false),
        getUsers: vi.fn().mockReturnValue(new Map()),
        addUserToNotify: vi.fn(),
        deleteUserToNotify: vi.fn(),
        hasUserToNotify: vi.fn().mockReturnValue(false),
        getUsersToNotify: vi.fn().mockReturnValue(new Map()),
        getTotalCount: vi.fn().mockReturnValue(0),
    };
    const lifecycleManager: IStateLifecycleManager = {
        getCurrentState: vi.fn().mockReturnValue(state),
        transitionTo: vi.fn().mockResolvedValue(undefined),
        dispatchSwitchEvent: vi.fn(),
        dispose: vi.fn(),
    };

    return { space, publishMetadata, orchestrator, userRegistry, lifecycleManager };
}

function getRecordingSessionId(
    handleStartRecording: ReturnType<typeof vi.fn<(user: SpaceUser, recordingSessionId: string) => Promise<unknown>>>
): string {
    const lastCall = handleStartRecording.mock.calls.at(-1);
    expect(lastCall).toBeDefined();

    const recordingSessionId = lastCall?.[1];
    expect(recordingSessionId).toEqual(expect.any(String));
    return recordingSessionId as string;
}

describe("RecordingManager", () => {
    it("stays in starting until the start webhook confirms the egress", async () => {
        const { state, mocks } = createRecordableState();
        const { space, publishMetadata, orchestrator, userRegistry, lifecycleManager } = createDependencies(state);
        const manager = new RecordingManager(space, orchestrator, userRegistry, lifecycleManager);
        const user = createUser("user-1");

        await manager.startRecording(user);
        const recordingSessionId = getRecordingSessionId(mocks.handleStartRecording);

        expect(manager.getRecordingState().status).toBe("starting");
        expect(mocks.handleStartRecording).toHaveBeenCalledWith(user, recordingSessionId);
        expect(publishMetadata).toHaveBeenCalledTimes(1);
        expect(publishMetadata).toHaveBeenNthCalledWith(1, {
            recording: {
                recorder: "user-1",
                recording: false,
                status: "starting",
            },
        });

        expect(manager.confirmRecordingStartedByWebhook(recordingSessionId, "egress-1", "test-space")).toBe(true);
        expect(publishMetadata).toHaveBeenNthCalledWith(2, {
            recording: {
                recorder: "user-1",
                recording: true,
                status: "recording",
            },
        });
    });

    it("accepts a started webhook before the LiveKit start call resolves", async () => {
        const { state, mocks } = createRecordableState();
        let resolveStart: ((startInfo: { egressId: string; roomName: string }) => void) | undefined;
        mocks.handleStartRecording.mockImplementation(
            () =>
                new Promise<{ egressId: string; roomName: string }>((resolve) => {
                    resolveStart = resolve;
                })
        );
        const { space, publishMetadata, orchestrator, userRegistry, lifecycleManager } = createDependencies(state);
        const manager = new RecordingManager(space, orchestrator, userRegistry, lifecycleManager);
        const user = createUser("user-1");

        const startPromise = manager.startRecording(user);
        expect(mocks.handleStartRecording).toHaveBeenCalledTimes(1);

        const recordingSessionId = getRecordingSessionId(mocks.handleStartRecording);
        expect(manager.confirmRecordingStartedByWebhook(recordingSessionId, "egress-1", "test-space")).toBe(true);

        resolveStart?.({ egressId: "egress-1", roomName: "test-space" });
        await startPromise;

        expect(manager.getRecordingState().status).toBe("recording");
        expect(publishMetadata).toHaveBeenCalledTimes(2);
    });

    it("ignores mismatched webhook events", async () => {
        const { state, mocks } = createRecordableState();
        const { space, publishMetadata, orchestrator, userRegistry, lifecycleManager } = createDependencies(state);
        const manager = new RecordingManager(space, orchestrator, userRegistry, lifecycleManager);

        await manager.startRecording(createUser("user-1"));
        const recordingSessionId = getRecordingSessionId(mocks.handleStartRecording);

        expect(manager.confirmRecordingStartedByWebhook(recordingSessionId, "egress-2", "test-space")).toBe(false);
        expect(manager.confirmRecordingStartedByWebhook(recordingSessionId, "egress-1", "wrong-room")).toBe(false);
        expect(publishMetadata).toHaveBeenCalledTimes(1);
    });

    it("returns recorder information when an unexpected end webhook is processed", async () => {
        const { state, mocks } = createRecordableState();
        const { space, publishMetadata, orchestrator, userRegistry, lifecycleManager } = createDependencies(state);
        const manager = new RecordingManager(space, orchestrator, userRegistry, lifecycleManager);
        const user = createUser("user-1");

        await manager.startRecording(user);
        const recordingSessionId = getRecordingSessionId(mocks.handleStartRecording);
        manager.confirmRecordingStartedByWebhook(recordingSessionId, "egress-1", "test-space");

        const result = manager.finishRecordingByWebhook(recordingSessionId, "egress-1", "test-space");

        expect(result).toEqual({
            processed: true,
            recorder: user,
            unexpected: true,
            hasActiveSessions: false,
        });
        expect(publishMetadata).toHaveBeenNthCalledWith(3, {
            recording: {
                recorder: null,
                recording: false,
                status: "idle",
            },
        });
    });

    it("rolls back to idle when start fails", async () => {
        const { state, mocks } = createRecordableState();
        mocks.handleStartRecording.mockRejectedValueOnce(new Error("boom"));
        const { space, publishMetadata, orchestrator, userRegistry, lifecycleManager } = createDependencies(state);
        const manager = new RecordingManager(space, orchestrator, userRegistry, lifecycleManager);

        await expect(manager.startRecording(createUser("user-1"))).rejects.toThrow("boom");

        expect(publishMetadata).toHaveBeenNthCalledWith(1, {
            recording: {
                recorder: "user-1",
                recording: false,
                status: "starting",
            },
        });
        expect(publishMetadata).toHaveBeenNthCalledWith(2, {
            recording: {
                recorder: null,
                recording: false,
                status: "idle",
            },
        });
    });

    it("deduplicates duplicate start requests from the same owner", async () => {
        const { state, mocks } = createRecordableState();
        let resolveStart: ((startInfo: { egressId: string; roomName: string }) => void) | undefined;
        mocks.handleStartRecording.mockImplementation(
            () =>
                new Promise<{ egressId: string; roomName: string }>((resolve) => {
                    resolveStart = resolve;
                })
        );
        const { space, publishMetadata, orchestrator, userRegistry, lifecycleManager } = createDependencies(state);
        const manager = new RecordingManager(space, orchestrator, userRegistry, lifecycleManager);
        const user = createUser("user-1");

        const firstStart = manager.startRecording(user);
        const secondStart = manager.startRecording(user);

        expect(mocks.handleStartRecording).toHaveBeenCalledTimes(1);
        resolveStart?.({ egressId: "egress-1", roomName: "test-space" });
        await Promise.all([firstStart, secondStart]);

        expect(publishMetadata).toHaveBeenCalledTimes(1);
    });

    it("rejects start and stop requests from another user while a recording is owned", async () => {
        const { state, mocks } = createRecordableState();
        const { space, orchestrator, userRegistry, lifecycleManager } = createDependencies(state);
        const manager = new RecordingManager(space, orchestrator, userRegistry, lifecycleManager);
        const owner = createUser("user-1");
        const otherUser = createUser("user-2");

        await manager.startRecording(owner);
        const recordingSessionId = getRecordingSessionId(mocks.handleStartRecording);
        manager.confirmRecordingStartedByWebhook(recordingSessionId, "egress-1", "test-space");

        await expect(manager.startRecording(otherUser)).rejects.toThrow("Recording already started");
        await expect(manager.stopRecording(otherUser)).rejects.toThrow("User is not the one recording");
    });

    it("stops automatically after start completes when the owner leaves during starting", async () => {
        const { state, mocks } = createRecordableState();
        let resolveStart: ((startInfo: { egressId: string; roomName: string }) => void) | undefined;
        mocks.handleStartRecording.mockImplementation(
            () =>
                new Promise<{ egressId: string; roomName: string }>((resolve) => {
                    resolveStart = resolve;
                })
        );
        const { space, publishMetadata, orchestrator, userRegistry, lifecycleManager } = createDependencies(state);
        const manager = new RecordingManager(space, orchestrator, userRegistry, lifecycleManager);
        const user = createUser("user-1");

        const startPromise = manager.startRecording(user);
        const recordingSessionId = getRecordingSessionId(mocks.handleStartRecording);
        const leavePromise = manager.stopRecordingIfRecorderMatches("user-1");

        resolveStart?.({ egressId: "egress-1", roomName: "test-space" });

        await startPromise;
        await expect(leavePromise).resolves.toEqual(user);
        expect(mocks.handleStopRecording).not.toHaveBeenCalled();

        manager.confirmRecordingStartedByWebhook(recordingSessionId, "egress-1", "test-space");
        expect(mocks.handleStopRecording).toHaveBeenCalledTimes(1);
        expect(mocks.handleStopRecording).toHaveBeenCalledWith("egress-1");
        expect(publishMetadata).toHaveBeenNthCalledWith(1, {
            recording: {
                recorder: "user-1",
                recording: false,
                status: "starting",
            },
        });
        expect(publishMetadata).toHaveBeenNthCalledWith(2, {
            recording: {
                recorder: "user-1",
                recording: true,
                status: "recording",
            },
        });
        expect(publishMetadata).toHaveBeenNthCalledWith(3, {
            recording: {
                recorder: "user-1",
                recording: true,
                status: "stopping",
            },
        });
        expect(publishMetadata).toHaveBeenNthCalledWith(4, {
            recording: {
                recorder: "user-1",
                recording: true,
                status: "stopping",
            },
        });

        expect(manager.finishRecordingByWebhook(recordingSessionId, "egress-1", "test-space")).toEqual({
            processed: true,
            recorder: user,
            unexpected: false,
            hasActiveSessions: false,
        });
        expect(publishMetadata).toHaveBeenNthCalledWith(5, {
            recording: {
                recorder: null,
                recording: false,
                status: "idle",
            },
        });
    });

    it("rolls back to recording when stop fails", async () => {
        const { state, mocks } = createRecordableState();
        mocks.handleStopRecording.mockRejectedValueOnce(new Error("stop-failed"));
        const { space, publishMetadata, orchestrator, userRegistry, lifecycleManager } = createDependencies(state);
        const manager = new RecordingManager(space, orchestrator, userRegistry, lifecycleManager);
        const user = createUser("user-1");

        await manager.startRecording(user);
        const recordingSessionId = getRecordingSessionId(mocks.handleStartRecording);
        manager.confirmRecordingStartedByWebhook(recordingSessionId, "egress-1", "test-space");
        await expect(manager.stopRecording(user)).rejects.toThrow("stop-failed");

        expect(publishMetadata).toHaveBeenNthCalledWith(3, {
            recording: {
                recorder: "user-1",
                recording: true,
                status: "stopping",
            },
        });
        expect(publishMetadata).toHaveBeenNthCalledWith(4, {
            recording: {
                recorder: "user-1",
                recording: true,
                status: "recording",
            },
        });
    });
});
