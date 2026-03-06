import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { TranscriptionManager } from "../src/Model/TranscriptionManager";
import { CommunicationType } from "../src/Model/Types/CommunicationTypes";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";
import type { ICommunicationState } from "../src/Model/Interfaces/ICommunicationState";
import type { ICommunicationStrategy, ITranscribableStrategy } from "../src/Model/Interfaces/ICommunicationStrategy";
import type { IStateLifecycleManager } from "../src/Model/Interfaces/IStateLifecycleManager";
import type { ITransitionOrchestrator } from "../src/Model/Interfaces/ITransitionOrchestrator";
import type { IUserRegistry } from "../src/Model/Interfaces/IUserRegistry";

describe("TranscriptionManager", () => {
    const createSpaceUser = (id: string, playUri = "http://play.test"): SpaceUser =>
        SpaceUser.fromPartial({
            spaceUserId: id,
            uuid: `uuid-${id}`,
            name: `User ${id}`,
            playUri,
        });

    const createSpace = (): ICommunicationSpace => ({
        getAllUsers: () => [],
        getUsersInFilter: () => [],
        getUsersToNotify: () => [],
        dispatchPrivateEvent: vi.fn(),
        dispatchPublicEvent: vi.fn().mockResolvedValue(undefined),
        getSpaceName: () => "test-space",
        getPropertiesToSync: () => ["cameraState", "microphoneState"],
        updateMetadata: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn(),
    });

    const createBaseState = (
        type: CommunicationType
    ): ICommunicationState<ICommunicationStrategy> & { mocks: Record<string, ReturnType<typeof vi.fn>> } => {
        const mocks = {
            init: vi.fn().mockResolvedValue(undefined),
            finalize: vi.fn(),
            switchState: vi.fn(),
            handleUserAdded: vi.fn().mockResolvedValue(undefined),
            handleUserDeleted: vi.fn().mockResolvedValue(undefined),
            handleUserUpdated: vi.fn().mockResolvedValue(undefined),
            handleUserToNotifyAdded: vi.fn().mockResolvedValue(undefined),
            handleUserToNotifyDeleted: vi.fn().mockResolvedValue(undefined),
            handleMeetingConnectionRestartMessage: vi.fn(),
        };

        return {
            communicationType: type,
            init: mocks.init,
            finalize: mocks.finalize,
            switchState: mocks.switchState,
            handleUserAdded: mocks.handleUserAdded,
            handleUserDeleted: mocks.handleUserDeleted,
            handleUserUpdated: mocks.handleUserUpdated,
            handleUserToNotifyAdded: mocks.handleUserToNotifyAdded,
            handleUserToNotifyDeleted: mocks.handleUserToNotifyDeleted,
            handleMeetingConnectionRestartMessage: mocks.handleMeetingConnectionRestartMessage,
            mocks,
        };
    };

    const createTranscribableState = (
        type: CommunicationType
    ): ICommunicationState<ITranscribableStrategy> & {
        handleStartTranscription: ReturnType<typeof vi.fn>;
        handleStopTranscription: ReturnType<typeof vi.fn>;
    } => {
        const baseState = createBaseState(type);
        const handleStartTranscription = vi.fn().mockResolvedValue(undefined);
        const handleStopTranscription = vi.fn().mockResolvedValue(undefined);

        return {
            ...baseState,
            handleStartTranscription,
            handleStopTranscription,
        };
    };

    const createLifecycleManager = (
        initialState: ICommunicationState<ICommunicationStrategy>
    ): IStateLifecycleManager & { mocks: Record<string, ReturnType<typeof vi.fn>> } => {
        let currentState = initialState;
        const mocks = {
            getCurrentState: vi.fn(() => currentState),
            transitionTo: vi.fn((newState: ICommunicationState<ICommunicationStrategy>) => {
                currentState = newState;
                return Promise.resolve();
            }),
            dispatchSwitchEvent: vi.fn(),
            dispose: vi.fn(),
        };

        return {
            getCurrentState: mocks.getCurrentState,
            transitionTo: mocks.transitionTo,
            dispatchSwitchEvent: mocks.dispatchSwitchEvent,
            dispose: mocks.dispose,
            mocks,
        };
    };

    const createOrchestrator = (
        nextState: ICommunicationState<ICommunicationStrategy> | null = null
    ): ITransitionOrchestrator & { mocks: Record<string, ReturnType<typeof vi.fn>> } => {
        const mocks = {
            executeImmediateTransition: vi.fn().mockResolvedValue(nextState),
            scheduleDelayedTransition: vi.fn(),
            cancelPendingTransition: vi.fn(),
            hasPendingTransition: vi.fn().mockReturnValue(false),
            waitForTransitionLock: vi.fn().mockResolvedValue(undefined),
            setTransitionLock: vi.fn(),
            clearTransitionLock: vi.fn(),
            dispose: vi.fn(),
        };

        return {
            executeImmediateTransition: mocks.executeImmediateTransition,
            scheduleDelayedTransition: mocks.scheduleDelayedTransition,
            cancelPendingTransition: mocks.cancelPendingTransition,
            hasPendingTransition: mocks.hasPendingTransition,
            waitForTransitionLock: mocks.waitForTransitionLock,
            setTransitionLock: mocks.setTransitionLock,
            clearTransitionLock: mocks.clearTransitionLock,
            dispose: mocks.dispose,
            mocks,
        };
    };

    const createUserRegistry = (): IUserRegistry => {
        const users = new Map<string, SpaceUser>();
        const usersToNotify = new Map<string, SpaceUser>();

        return {
            addUser(user: SpaceUser) {
                users.set(user.spaceUserId, user);
            },
            deleteUser(spaceUserId: string) {
                users.delete(spaceUserId);
            },
            addUserToNotify(user: SpaceUser) {
                usersToNotify.set(user.spaceUserId, user);
            },
            deleteUserToNotify(spaceUserId: string) {
                usersToNotify.delete(spaceUserId);
            },
            getUsers() {
                return users;
            },
            getUsersToNotify() {
                return usersToNotify;
            },
            getTotalCount() {
                return new Set([...users.keys(), ...usersToNotify.keys()]).size;
            },
            hasUser(spaceUserId: string) {
                return users.has(spaceUserId);
            },
            hasUserToNotify(spaceUserId: string) {
                return usersToNotify.has(spaceUserId);
            },
        };
    };

    it("starts transcription directly when current state is transcribable", async () => {
        const user = createSpaceUser("owner");
        const transcribableState = createTranscribableState(CommunicationType.LIVEKIT);
        const lifecycleManager = createLifecycleManager(transcribableState);
        const orchestrator = createOrchestrator();
        const manager = new TranscriptionManager(createSpace(), orchestrator, createUserRegistry(), lifecycleManager);

        await manager.startTranscription(user);

        expect(transcribableState.handleStartTranscription).toHaveBeenCalledWith(user);
        expect(orchestrator.mocks.executeImmediateTransition).not.toHaveBeenCalled();
        expect(manager.isTranscribing).toBe(true);
    });

    it("forces an immediate switch to LiveKit when current state is not transcribable", async () => {
        const user = createSpaceUser("owner");
        const webRtcState = createBaseState(CommunicationType.WEBRTC);
        const livekitState = createTranscribableState(CommunicationType.LIVEKIT);
        const lifecycleManager = createLifecycleManager(webRtcState);
        const orchestrator = createOrchestrator(livekitState);
        const manager = new TranscriptionManager(createSpace(), orchestrator, createUserRegistry(), lifecycleManager);

        await manager.startTranscription(user);

        expect(orchestrator.mocks.executeImmediateTransition).toHaveBeenCalledWith(
            CommunicationType.LIVEKIT,
            expect.objectContaining({
                playUri: user.playUri,
            })
        );
        expect(lifecycleManager.mocks.transitionTo).toHaveBeenCalledWith(livekitState);
        expect(livekitState.handleStartTranscription).toHaveBeenCalledWith(user);
        expect(manager.isTranscribing).toBe(true);
    });

    it("stops transcription when owner stops", async () => {
        const user = createSpaceUser("owner");
        const transcribableState = createTranscribableState(CommunicationType.LIVEKIT);
        const lifecycleManager = createLifecycleManager(transcribableState);
        const orchestrator = createOrchestrator();
        const manager = new TranscriptionManager(createSpace(), orchestrator, createUserRegistry(), lifecycleManager);

        await manager.startTranscription(user);
        await manager.stopTranscription(user);

        expect(transcribableState.handleStopTranscription).toHaveBeenCalledTimes(1);
        expect(manager.isTranscribing).toBe(false);
    });

    it("rejects stop requests from non-owners", async () => {
        const owner = createSpaceUser("owner");
        const otherUser = createSpaceUser("other");
        const transcribableState = createTranscribableState(CommunicationType.LIVEKIT);
        const lifecycleManager = createLifecycleManager(transcribableState);
        const orchestrator = createOrchestrator();
        const manager = new TranscriptionManager(createSpace(), orchestrator, createUserRegistry(), lifecycleManager);

        await manager.startTranscription(owner);

        await expect(manager.stopTranscription(otherUser)).rejects.toThrow("User is not the one transcribing");
        expect(manager.isTranscribing).toBe(true);
    });

    it("auto-stops transcription when owner leaves", async () => {
        const owner = createSpaceUser("owner");
        const transcribableState = createTranscribableState(CommunicationType.LIVEKIT);
        const lifecycleManager = createLifecycleManager(transcribableState);
        const orchestrator = createOrchestrator();
        const manager = new TranscriptionManager(createSpace(), orchestrator, createUserRegistry(), lifecycleManager);

        await manager.startTranscription(owner);
        await manager.handleRemoveUser(owner);

        expect(transcribableState.handleStopTranscription).toHaveBeenCalledTimes(1);
        expect(manager.isTranscribing).toBe(false);
    });
});
