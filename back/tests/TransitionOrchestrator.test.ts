import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { TransitionOrchestrator } from "../src/Model/Services/TransitionOrchestrator";
import { CommunicationType } from "../src/Model/Types/CommunicationTypes";
import { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";
import { TransitionContext } from "../src/Model/Interfaces/ITransitionOrchestrator";
import { StateFactory } from "../src/Model/States/StateFactory";
import { ICommunicationState } from "../src/Model/Interfaces/ICommunicationState";

// Mock StateFactory - necessary because it creates states with external dependencies (LiveKit, etc.)
vi.mock("../src/Model/States/StateFactory", () => ({
    StateFactory: {
        createState: vi.fn(),
    },
}));

describe("TransitionOrchestrator", () => {
    const DELAY_MS = 100;
    let orchestrator: TransitionOrchestrator;

    // Get mocked StateFactory for easier access
    const getMockedCreateState = () => vi.mocked(StateFactory).createState;

    // Real context object (no mock for simple data objects)
    const createTransitionContext = (): TransitionContext => ({
        space: {
            getAllUsers: () => [],
            getUsersInFilter: () => [],
            getUsersToNotify: () => [],
            dispatchPrivateEvent: () => {},
            dispatchPublicEvent: () => {},
            getSpaceName: () => "test-space",
            getPropertiesToSync: () => ["cameraState", "microphoneState"],
        } as ICommunicationSpace,
        users: new Map<string, SpaceUser>(),
        usersToNotify: new Map<string, SpaceUser>(),
        playUri: "http://test.com",
    });

    // Minimal state object for testing (real object, not mock)
    const createMockState = (type: CommunicationType): ICommunicationState => ({
        communicationType: type,
        init: () => {},
        finalize: () => {},
        switchState: () => {},
        handleUserAdded: async () => {},
        handleUserDeleted: async () => {},
        handleUserUpdated: async () => {},
        handleUserToNotifyAdded: async () => {},
        handleUserToNotifyDeleted: async () => {},
    });

    beforeEach(() => {
        vi.useFakeTimers();
        orchestrator = new TransitionOrchestrator(DELAY_MS);

        const mockState = createMockState(CommunicationType.LIVEKIT);
        getMockedCreateState().mockResolvedValue(mockState);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        orchestrator.dispose();
    });

    describe("executeImmediateTransition", () => {
        it("should return new state when transition succeeds", async () => {
            const context = createTransitionContext();
            const expectedState = createMockState(CommunicationType.LIVEKIT);
            getMockedCreateState().mockResolvedValue(expectedState);

            const result = await orchestrator.executeImmediateTransition(CommunicationType.LIVEKIT, context);

            expect(result).toBe(expectedState);
        });

        it("should call StateFactory with correct parameters when executing transition", async () => {
            const context = createTransitionContext();

            await orchestrator.executeImmediateTransition(CommunicationType.LIVEKIT, context);

            expect(getMockedCreateState()).toHaveBeenCalledWith(
                CommunicationType.LIVEKIT,
                context.space,
                context.users,
                context.usersToNotify,
                { playUri: context.playUri }
            );
        });

        it("should return null when StateFactory throws an error", async () => {
            getMockedCreateState().mockRejectedValue(new Error("Creation failed"));
            const context = createTransitionContext();

            const result = await orchestrator.executeImmediateTransition(CommunicationType.LIVEKIT, context);

            expect(result).toBeNull();
        });

        it("should return null when transition is aborted during state creation", async () => {
            getMockedCreateState().mockImplementation(async () => {
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 50);
                });
                return createMockState(CommunicationType.LIVEKIT);
            });
            const context = createTransitionContext();

            const promise = orchestrator.executeImmediateTransition(CommunicationType.LIVEKIT, context);
            orchestrator.cancelPendingTransition();
            vi.advanceTimersByTime(100);

            const result = await promise;
            expect(result).toBeNull();
        });

        it("should clear pending state when transition completes successfully", async () => {
            const context = createTransitionContext();

            await orchestrator.executeImmediateTransition(CommunicationType.LIVEKIT, context);

            expect(orchestrator.hasPendingTransition()).toBe(false);
        });
    });

    describe("scheduleDelayedTransition", () => {
        it("should execute callback after delay when transition is not aborted", async () => {
            const context = createTransitionContext();
            const onComplete = vi.fn();

            orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);
            expect(onComplete).not.toHaveBeenCalled();

            vi.advanceTimersByTime(DELAY_MS + 10);
            await vi.runAllTimersAsync();

            expect(onComplete).toHaveBeenCalled();
        });

        it("should not execute callback when cancelled before delay completes", async () => {
            const context = createTransitionContext();
            const onComplete = vi.fn();

            orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);
            vi.advanceTimersByTime(DELAY_MS / 2);
            orchestrator.cancelPendingTransition();
            vi.advanceTimersByTime(DELAY_MS);
            await vi.runAllTimersAsync();

            expect(onComplete).not.toHaveBeenCalled();
        });

        it("should return same abort controller when transition is already scheduled", () => {
            const context = createTransitionContext();
            const onComplete = vi.fn();

            const result1 = orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);
            const result2 = orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);

            expect(result1.abortController).toBe(result2.abortController);
        });

        it("should call onError callback when StateFactory throws an error", async () => {
            getMockedCreateState().mockRejectedValue(new Error("Creation failed"));
            const context = createTransitionContext();
            const onComplete = vi.fn();
            const onError = vi.fn();

            orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete, onError);
            vi.advanceTimersByTime(DELAY_MS + 10);
            await vi.runAllTimersAsync();

            expect(onComplete).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalled();
        });

        it("should return StateTransitionResult with nextStatePromise and abortController", () => {
            const context = createTransitionContext();
            const onComplete = vi.fn();

            const result = orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);

            expect(result.nextStatePromise).toBeDefined();
            expect(result.abortController).toBeDefined();
        });
    });

    describe("cancelPendingTransition", () => {
        it("should abort pending transition when called", () => {
            const context = createTransitionContext();
            const onComplete = vi.fn();
            const result = orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);
            const abortSpy = vi.spyOn(result.abortController!, "abort");

            orchestrator.cancelPendingTransition();

            expect(abortSpy).toHaveBeenCalled();
        });

        it("should clear pending state when called", () => {
            const context = createTransitionContext();
            const onComplete = vi.fn();
            orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);
            expect(orchestrator.hasPendingTransition()).toBe(true);

            orchestrator.cancelPendingTransition();

            expect(orchestrator.hasPendingTransition()).toBe(false);
        });

        it("should not throw when no pending transition exists", () => {
            expect(() => orchestrator.cancelPendingTransition()).not.toThrow();
        });
    });

    describe("hasPendingTransition", () => {
        it("should return false when no transition has been scheduled", () => {
            expect(orchestrator.hasPendingTransition()).toBe(false);
        });

        it("should return true when transition is scheduled and pending", () => {
            const context = createTransitionContext();
            const onComplete = vi.fn();

            orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);

            expect(orchestrator.hasPendingTransition()).toBe(true);
        });

        it("should return false when scheduled transition has completed", async () => {
            const context = createTransitionContext();
            const onComplete = vi.fn();

            orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);
            vi.advanceTimersByTime(DELAY_MS + 10);
            await vi.runAllTimersAsync();

            expect(orchestrator.hasPendingTransition()).toBe(false);
        });
    });

    describe("waitForTransitionLock", () => {
        it("should resolve immediately when no lock exists", async () => {
            await expect(orchestrator.waitForTransitionLock()).resolves.toBeUndefined();
        });

        it("should wait until lock is released when lock exists", async () => {
            let resolveLock: () => void;
            const lockPromise = new Promise<void>((resolve) => {
                resolveLock = resolve;
            });
            orchestrator.setTransitionLock(lockPromise);

            let resolved = false;
            const waitPromise = orchestrator.waitForTransitionLock().then(() => {
                resolved = true;
            });

            await Promise.resolve();
            expect(resolved).toBe(false);

            resolveLock!();
            await waitPromise;

            expect(resolved).toBe(true);
        });
    });

    describe("setTransitionLock and clearTransitionLock", () => {
        it("should allow immediate resolution when lock is set then cleared", async () => {
            let resolveLock: () => void;
            const lockPromise = new Promise<void>((resolve) => {
                resolveLock = resolve;
            });

            orchestrator.setTransitionLock(lockPromise);
            orchestrator.clearTransitionLock();

            await expect(orchestrator.waitForTransitionLock()).resolves.toBeUndefined();

            resolveLock!();
        });
    });

    describe("dispose", () => {
        it("should cancel pending transition when disposed", () => {
            const context = createTransitionContext();
            const onComplete = vi.fn();
            orchestrator.scheduleDelayedTransition(CommunicationType.WEBRTC, context, onComplete);

            orchestrator.dispose();

            expect(orchestrator.hasPendingTransition()).toBe(false);
        });

        it("should clear transition lock when disposed", async () => {
            let resolveLock: () => void;
            const lockPromise = new Promise<void>((resolve) => {
                resolveLock = resolve;
            });
            orchestrator.setTransitionLock(lockPromise);

            orchestrator.dispose();

            await expect(orchestrator.waitForTransitionLock()).resolves.toBeUndefined();
            resolveLock!();
        });
    });
});
