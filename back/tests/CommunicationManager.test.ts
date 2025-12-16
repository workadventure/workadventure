// Disabled because test mocks use vi.fn() which are passed as object properties
import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { CommunicationManager, InitialStateFactory } from "../src/Model/CommunicationManager";
import { CommunicationType } from "../src/Model/Types/CommunicationTypes";
import { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";
import { ICommunicationState } from "../src/Model/Interfaces/ICommunicationState";
import { ITransitionPolicy } from "../src/Model/Interfaces/ITransitionPolicy";
import { ITransitionOrchestrator, TransitionCompleteCallback } from "../src/Model/Interfaces/ITransitionOrchestrator";
import { IStateLifecycleManager } from "../src/Model/Interfaces/IStateLifecycleManager";
import { UserRegistry } from "../src/Model/Services/UserRegistry";

describe("CommunicationManager", () => {
    // Helper to create real SpaceUser objects
    const createSpaceUser = (id: string, playUri = "http://test.com"): SpaceUser => {
        return SpaceUser.fromPartial({
            spaceUserId: id,
            uuid: `uuid-${id}`,
            name: `User ${id}`,
            playUri,
        });
    };

    // Real state object (minimal implementation)
    const createState = (
        type: CommunicationType
    ): ICommunicationState & { mocks: Record<string, ReturnType<typeof vi.fn>> } => {
        const mocks = {
            init: vi.fn(),
            finalize: vi.fn(),
            switchState: vi.fn(),
            handleUserAdded: vi.fn().mockResolvedValue(undefined),
            handleUserDeleted: vi.fn().mockResolvedValue(undefined),
            handleUserUpdated: vi.fn().mockResolvedValue(undefined),
            handleUserToNotifyAdded: vi.fn().mockResolvedValue(undefined),
            handleUserToNotifyDeleted: vi.fn().mockResolvedValue(undefined),
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
            mocks,
        };
    };

    // Real space implementation (no complex mock)
    const createSpace = (users: SpaceUser[] = []): ICommunicationSpace => ({
        getAllUsers: () => users,
        getUsersInFilter: () => users,
        getUsersToNotify: () => [],
        dispatchPrivateEvent: () => {},
        dispatchPublicEvent: () => {},
        getSpaceName: () => "test-space",
        getPropertiesToSync: () => ["cameraState", "microphoneState"],
    });

    // Real policy implementation (simple, testable)
    const createPolicy = (
        shouldTransitionResult = false,
        nextStateType: CommunicationType | null = null
    ): ITransitionPolicy & { mocks: Record<string, ReturnType<typeof vi.fn>> } => {
        const mocks = {
            shouldTransition: vi.fn().mockReturnValue(shouldTransitionResult),
            getNextStateType: vi.fn().mockReturnValue(nextStateType),
        };
        return {
            shouldTransition: mocks.shouldTransition,
            getNextStateType: mocks.getNextStateType,
            mocks,
        };
    };

    // Real orchestrator implementation
    const createOrchestrator = (): ITransitionOrchestrator & { mocks: Record<string, ReturnType<typeof vi.fn>> } => {
        const mocks = {
            executeImmediateTransition: vi.fn().mockResolvedValue(null),
            scheduleDelayedTransition: vi.fn().mockReturnValue({ abortController: new AbortController() }),
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

    // Real lifecycle manager implementation
    const createLifecycleManager = (
        initialState: ICommunicationState
    ): IStateLifecycleManager & { mocks: Record<string, ReturnType<typeof vi.fn>> } => {
        const mocks = {
            getCurrentState: vi.fn().mockReturnValue(initialState),
            transitionTo: vi.fn(),
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

    // Initial state factory
    const createInitialStateFactory = (
        state: ICommunicationState
    ): InitialStateFactory & { mocks: Record<string, ReturnType<typeof vi.fn>> } => {
        const mocks = {
            createInitialState: vi.fn().mockReturnValue(state),
        };
        return {
            createInitialState: mocks.createInitialState,
            mocks,
        };
    };

    describe("constructor", () => {
        it("should create manager with default dependencies when none provided", () => {
            const space = createSpace();

            const manager = new CommunicationManager(space);

            expect(manager).toBeDefined();
        });

        it("should use injected userRegistry when provided", async () => {
            const space = createSpace();
            const userRegistry = new UserRegistry();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                userRegistry: userRegistry,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserAdded(user);

            expect(userRegistry.hasUser("user_1")).toBe(true);
        });

        it("should use injected policy when provided", async () => {
            const space = createSpace();
            const policy = createPolicy(false);
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                policy: policy,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserAdded(user);

            expect(policy.mocks.shouldTransition).toHaveBeenCalled();
        });

        it("should use injected initialStateFactory when provided", () => {
            const space = createSpace();
            const customState = createState(CommunicationType.LIVEKIT);
            const initialStateFactory = createInitialStateFactory(customState);

            new CommunicationManager(space, { initialStateFactory: initialStateFactory });

            expect(initialStateFactory.mocks.createInitialState).toHaveBeenCalledWith(
                space,
                expect.any(Map),
                expect.any(Map)
            );
        });
    });

    describe("handleUserAdded", () => {
        it("should add user to registry when user is added", async () => {
            const space = createSpace();
            const userRegistry = new UserRegistry();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);
            const policy = createPolicy(false);

            const manager = new CommunicationManager(space, {
                userRegistry: userRegistry,
                lifecycleManager: lifecycleManager,
                policy: policy,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserAdded(user);

            expect(userRegistry.hasUser("user_1")).toBe(true);
        });

        it("should delegate to current state when user is added", async () => {
            const space = createSpace();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);
            const policy = createPolicy(false);

            const manager = new CommunicationManager(space, {
                lifecycleManager: lifecycleManager,
                policy: policy,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserAdded(user);

            expect(state.mocks.handleUserAdded).toHaveBeenCalledWith(user);
        });

        it("should evaluate transition when user is added", async () => {
            const space = createSpace();
            const policy = createPolicy(false);
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                policy: policy,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserAdded(user);

            expect(policy.mocks.shouldTransition).toHaveBeenCalledWith(CommunicationType.WEBRTC, 0);
        });

        it("should cancel pending transition when conditions change after adding user", async () => {
            const space = createSpace();
            const orchestrator = createOrchestrator();
            orchestrator.mocks.hasPendingTransition.mockReturnValue(true);
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);
            const policy = createPolicy(false); // Should not transition -> cancel pending

            const manager = new CommunicationManager(space, {
                orchestrator: orchestrator,
                lifecycleManager: lifecycleManager,
                policy: policy,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserAdded(user);

            expect(orchestrator.mocks.cancelPendingTransition).toHaveBeenCalled();
        });
    });

    describe("handleUserDeleted", () => {
        it("should remove user from registry when user is deleted", async () => {
            const space = createSpace();
            const userRegistry = new UserRegistry();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);
            const policy = createPolicy(false);

            const manager = new CommunicationManager(space, {
                userRegistry: userRegistry,
                lifecycleManager: lifecycleManager,
                policy: policy,
            });

            const user = createSpaceUser("user_1");
            userRegistry.addUser(user);
            await manager.handleUserDeleted(user);

            expect(userRegistry.hasUser("user_1")).toBe(false);
        });

        it("should delegate to current state when user is deleted", async () => {
            const space = createSpace();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);
            const policy = createPolicy(false);

            const manager = new CommunicationManager(space, {
                lifecycleManager: lifecycleManager,
                policy: policy,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserDeleted(user);

            expect(state.mocks.handleUserDeleted).toHaveBeenCalledWith(user);
        });

        it("should evaluate transition when user is deleted", async () => {
            const space = createSpace();
            const policy = createPolicy(false);
            const state = createState(CommunicationType.LIVEKIT);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                policy: policy,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserDeleted(user);

            expect(policy.mocks.shouldTransition).toHaveBeenCalledWith(CommunicationType.LIVEKIT, 0);
        });
    });

    describe("handleUserUpdated", () => {
        it("should delegate to current state when user is updated", async () => {
            const space = createSpace();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserUpdated(user);

            expect(state.mocks.handleUserUpdated).toHaveBeenCalledWith(user);
        });

        it("should not evaluate transition when user is updated", async () => {
            const space = createSpace();
            const policy = createPolicy(false);
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                policy: policy,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserUpdated(user);

            expect(policy.mocks.shouldTransition).not.toHaveBeenCalled();
        });
    });

    describe("handleUserToNotifyAdded", () => {
        it("should add user to notify registry when user to notify is added", async () => {
            const space = createSpace();
            const userRegistry = new UserRegistry();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);
            const policy = createPolicy(false);

            const manager = new CommunicationManager(space, {
                userRegistry: userRegistry,
                lifecycleManager: lifecycleManager,
                policy: policy,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserToNotifyAdded(user);

            expect(userRegistry.hasUserToNotify("user_1")).toBe(true);
        });

        it("should delegate to current state when user to notify is added", async () => {
            const space = createSpace();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);
            const policy = createPolicy(false);

            const manager = new CommunicationManager(space, {
                lifecycleManager: lifecycleManager,
                policy: policy,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserToNotifyAdded(user);

            expect(state.mocks.handleUserToNotifyAdded).toHaveBeenCalledWith(user);
        });
    });

    describe("handleUserToNotifyDeleted", () => {
        it("should remove user from notify registry when user to notify is deleted", async () => {
            const space = createSpace();
            const userRegistry = new UserRegistry();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);
            const policy = createPolicy(false);

            const manager = new CommunicationManager(space, {
                userRegistry: userRegistry,
                lifecycleManager: lifecycleManager,
                policy: policy,
            });

            const user = createSpaceUser("user_1");
            userRegistry.addUserToNotify(user);
            await manager.handleUserToNotifyDeleted(user);

            expect(userRegistry.hasUserToNotify("user_1")).toBe(false);
        });

        it("should delegate to current state when user to notify is deleted", async () => {
            const space = createSpace();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);
            const policy = createPolicy(false);

            const manager = new CommunicationManager(space, {
                lifecycleManager: lifecycleManager,
                policy: policy,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserToNotifyDeleted(user);

            expect(state.mocks.handleUserToNotifyDeleted).toHaveBeenCalledWith(user);
        });
    });

    describe("transition evaluation", () => {
        it("should not transition when policy returns false", async () => {
            const space = createSpace();
            const policy = createPolicy(false);
            const orchestrator = createOrchestrator();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                policy: policy,
                orchestrator: orchestrator,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserAdded(user);

            expect(orchestrator.mocks.executeImmediateTransition).not.toHaveBeenCalled();
            expect(orchestrator.mocks.scheduleDelayedTransition).not.toHaveBeenCalled();
        });

        it("should execute immediate transition to LiveKit when policy approves", async () => {
            const users = [
                createSpaceUser("user_1"),
                createSpaceUser("user_2"),
                createSpaceUser("user_3"),
                createSpaceUser("user_4"),
                createSpaceUser("user_5"),
            ];
            const space = createSpace(users);
            const policy = createPolicy(true, CommunicationType.LIVEKIT);
            const orchestrator = createOrchestrator();
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                policy: policy,
                orchestrator: orchestrator,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_6");
            await manager.handleUserAdded(user);

            expect(orchestrator.mocks.executeImmediateTransition).toHaveBeenCalledWith(
                CommunicationType.LIVEKIT,
                expect.objectContaining({
                    space: space,
                    playUri: user.playUri,
                })
            );
        });

        it("should schedule delayed transition to WebRTC when policy approves", async () => {
            const space = createSpace([createSpaceUser("user_1")]);
            const policy = createPolicy(true, CommunicationType.WEBRTC);
            const orchestrator = createOrchestrator();
            const state = createState(CommunicationType.LIVEKIT);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                policy: policy,
                orchestrator: orchestrator,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserDeleted(user);

            expect(orchestrator.mocks.scheduleDelayedTransition).toHaveBeenCalledWith(
                CommunicationType.WEBRTC,
                expect.any(Object),
                expect.any(Function),
                expect.any(Function)
            );
        });

        it("should transition to new state when immediate transition succeeds", async () => {
            const users = [
                createSpaceUser("user_1"),
                createSpaceUser("user_2"),
                createSpaceUser("user_3"),
                createSpaceUser("user_4"),
                createSpaceUser("user_5"),
            ];
            const space = createSpace(users);
            const newState = createState(CommunicationType.LIVEKIT);
            const orchestrator = createOrchestrator();
            orchestrator.mocks.executeImmediateTransition.mockResolvedValue(newState);

            const policy = createPolicy(true, CommunicationType.LIVEKIT);
            const currentState = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(currentState);

            const manager = new CommunicationManager(space, {
                policy: policy,
                orchestrator: orchestrator,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_6");
            await manager.handleUserAdded(user);

            expect(lifecycleManager.mocks.transitionTo).toHaveBeenCalledWith(newState);
        });

        it("should not transition when immediate transition returns null", async () => {
            const users = [
                createSpaceUser("user_1"),
                createSpaceUser("user_2"),
                createSpaceUser("user_3"),
                createSpaceUser("user_4"),
                createSpaceUser("user_5"),
            ];
            const space = createSpace(users);
            const orchestrator = createOrchestrator();
            orchestrator.mocks.executeImmediateTransition.mockResolvedValue(null);

            const policy = createPolicy(true, CommunicationType.LIVEKIT);
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                policy: policy,
                orchestrator: orchestrator,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_6");
            await manager.handleUserAdded(user);

            expect(lifecycleManager.mocks.transitionTo).not.toHaveBeenCalled();
        });
    });

    describe("pending transition cancellation", () => {
        it("should cancel pending transition when conditions no longer allow transition", async () => {
            const space = createSpace();
            const orchestrator = createOrchestrator();
            orchestrator.mocks.hasPendingTransition.mockReturnValue(true);

            const policy = createPolicy(false); // No transition allowed
            const state = createState(CommunicationType.LIVEKIT);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                orchestrator: orchestrator,
                policy: policy,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserAdded(user);

            expect(orchestrator.mocks.cancelPendingTransition).toHaveBeenCalled();
        });

        it("should not cancel pending transition when conditions still allow transition", async () => {
            const space = createSpace([createSpaceUser("user_1")]);
            const orchestrator = createOrchestrator();
            orchestrator.mocks.hasPendingTransition.mockReturnValue(true);

            const policy = createPolicy(true, CommunicationType.WEBRTC); // Transition allowed
            const state = createState(CommunicationType.LIVEKIT);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                orchestrator: orchestrator,
                policy: policy,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_2");
            await manager.handleUserDeleted(user);

            // Should be called once for executeTransition, not for cancel
            expect(orchestrator.mocks.cancelPendingTransition).toHaveBeenCalledTimes(1);
        });

        it("should not try to cancel when no pending transition exists", async () => {
            const space = createSpace();
            const orchestrator = createOrchestrator();
            orchestrator.mocks.hasPendingTransition.mockReturnValue(false);

            const policy = createPolicy(false);
            const state = createState(CommunicationType.WEBRTC);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                orchestrator: orchestrator,
                policy: policy,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserAdded(user);

            expect(orchestrator.mocks.cancelPendingTransition).not.toHaveBeenCalled();
        });
    });

    describe("delayed transition callback", () => {
        it("should transition when delayed transition callback is invoked and conditions are still valid", async () => {
            const space = createSpace([createSpaceUser("user_1")]);
            const orchestrator = createOrchestrator();
            let capturedCallback: TransitionCompleteCallback | undefined;

            orchestrator.mocks.scheduleDelayedTransition.mockImplementation(
                (_type: CommunicationType, _context: unknown, onComplete: TransitionCompleteCallback) => {
                    capturedCallback = onComplete;
                    return { abortController: new AbortController() };
                }
            );

            const policy = createPolicy(true, CommunicationType.WEBRTC);
            const state = createState(CommunicationType.LIVEKIT);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                orchestrator: orchestrator,
                policy: policy,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserDeleted(user);

            // Simulate delayed transition completing
            const newState = createState(CommunicationType.WEBRTC);
            capturedCallback?.(newState);

            expect(lifecycleManager.mocks.transitionTo).toHaveBeenCalledWith(newState);
        });

        it("should not transition when delayed transition callback is invoked but conditions changed", async () => {
            const space = createSpace([createSpaceUser("user_1")]);
            const orchestrator = createOrchestrator();
            let capturedCallback: TransitionCompleteCallback | undefined;

            orchestrator.mocks.scheduleDelayedTransition.mockImplementation(
                (_type: CommunicationType, _context: unknown, onComplete: TransitionCompleteCallback) => {
                    capturedCallback = onComplete;
                    return { abortController: new AbortController() };
                }
            );

            // Start with transition allowed
            const policy = createPolicy(true, CommunicationType.WEBRTC);
            const state = createState(CommunicationType.LIVEKIT);
            const lifecycleManager = createLifecycleManager(state);

            const manager = new CommunicationManager(space, {
                orchestrator: orchestrator,
                policy: policy,
                lifecycleManager: lifecycleManager,
            });

            const user = createSpaceUser("user_1");
            await manager.handleUserDeleted(user);

            // Change conditions - transition no longer allowed
            policy.mocks.shouldTransition.mockReturnValue(false);

            // Simulate delayed transition completing
            const newState = createState(CommunicationType.WEBRTC);
            capturedCallback?.(newState);

            expect(lifecycleManager.mocks.transitionTo).not.toHaveBeenCalled();
        });
    });
});
