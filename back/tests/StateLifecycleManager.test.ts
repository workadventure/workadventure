/* eslint-disable @typescript-eslint/unbound-method */
// Disabled because test mocks use vi.fn() which are passed as object properties
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { StateLifecycleManager } from "../src/Model/Services/StateLifecycleManager";
import { ICommunicationState } from "../src/Model/Interfaces/ICommunicationState";
import { CommunicationType } from "../src/Model/Types/CommunicationTypes";

describe("StateLifecycleManager", () => {
    const FINALIZE_DELAY_MS = 100;
    let manager: StateLifecycleManager;
    let initialState: ICommunicationState;

    // Real state object (no complex mock) - follows "Real over Mock" principle
    const createState = (type: CommunicationType): ICommunicationState => {
        return {
            communicationType: type,
            init: vi.fn(),
            finalize: vi.fn(),
            switchState: vi.fn(),
            handleUserAdded: vi.fn().mockResolvedValue(undefined),
            handleUserDeleted: vi.fn().mockResolvedValue(undefined),
            handleUserUpdated: vi.fn().mockResolvedValue(undefined),
            handleUserToNotifyAdded: vi.fn().mockResolvedValue(undefined),
            handleUserToNotifyDeleted: vi.fn().mockResolvedValue(undefined),
        };
    };

    beforeEach(() => {
        vi.useFakeTimers();
        initialState = createState(CommunicationType.WEBRTC);
        manager = new StateLifecycleManager(initialState, FINALIZE_DELAY_MS);
    });

    afterEach(() => {
        vi.useRealTimers();
        manager.dispose();
    });

    describe("constructor", () => {
        it("should set initial state as current state when created", () => {
            expect(manager.getCurrentState()).toBe(initialState);
        });

        it("should not call init on initial state when created", () => {
            expect(initialState.init).not.toHaveBeenCalled();
        });
    });

    describe("getCurrentState", () => {
        it("should return initial state when no transition has occurred", () => {
            expect(manager.getCurrentState()).toBe(initialState);
        });

        it("should return new state when transition has occurred", () => {
            const newState = createState(CommunicationType.LIVEKIT);

            manager.transitionTo(newState);

            expect(manager.getCurrentState()).toBe(newState);
        });
    });

    describe("transitionTo", () => {
        it("should set new state as current when transitioning", () => {
            const newState = createState(CommunicationType.LIVEKIT);

            manager.transitionTo(newState);

            expect(manager.getCurrentState()).toBe(newState);
        });

        it("should call init on new state when transitioning", () => {
            const newState = createState(CommunicationType.LIVEKIT);

            manager.transitionTo(newState);

            expect(newState.init).toHaveBeenCalled();
        });

        it("should call switchState on old state with new state type when transitioning", () => {
            const newState = createState(CommunicationType.LIVEKIT);

            manager.transitionTo(newState);

            expect(initialState.switchState).toHaveBeenCalledWith(CommunicationType.LIVEKIT);
        });

        it("should finalize old state after delay when transitioning", () => {
            const newState = createState(CommunicationType.LIVEKIT);

            manager.transitionTo(newState);
            expect(initialState.finalize).not.toHaveBeenCalled();

            vi.advanceTimersByTime(FINALIZE_DELAY_MS + 10);

            expect(initialState.finalize).toHaveBeenCalled();
        });

        it("should finalize pending state immediately when another transition occurs before delay", () => {
            const state1 = createState(CommunicationType.LIVEKIT);
            const state2 = createState(CommunicationType.WEBRTC);

            manager.transitionTo(state1);
            vi.advanceTimersByTime(FINALIZE_DELAY_MS / 2);
            manager.transitionTo(state2);

            expect(initialState.finalize).toHaveBeenCalled();
        });

        it("should not finalize intermediate state immediately when rapid transitions occur", () => {
            const state1 = createState(CommunicationType.LIVEKIT);
            const state2 = createState(CommunicationType.WEBRTC);

            manager.transitionTo(state1);
            manager.transitionTo(state2);

            expect(state1.finalize).not.toHaveBeenCalled();

            vi.advanceTimersByTime(FINALIZE_DELAY_MS + 10);

            expect(state1.finalize).toHaveBeenCalled();
        });

        it("should call switchState before init when transitioning", () => {
            const newState = createState(CommunicationType.LIVEKIT);
            const callOrder: string[] = [];

            vi.mocked(initialState.switchState).mockImplementation(() => {
                callOrder.push("switchState");
            });
            vi.mocked(newState.init).mockImplementation(() => {
                callOrder.push("init");
            });

            manager.transitionTo(newState);

            expect(callOrder).toEqual(["switchState", "init"]);
        });
    });

    describe("dispatchSwitchEvent", () => {
        it("should call switchState on current state when dispatching event", () => {
            manager.dispatchSwitchEvent(CommunicationType.LIVEKIT);

            expect(initialState.switchState).toHaveBeenCalledWith(CommunicationType.LIVEKIT);
        });

        it("should call switchState on new current state when dispatching after transition", () => {
            const newState = createState(CommunicationType.LIVEKIT);
            manager.transitionTo(newState);
            vi.mocked(newState.switchState).mockClear();

            manager.dispatchSwitchEvent(CommunicationType.WEBRTC);

            expect(newState.switchState).toHaveBeenCalledWith(CommunicationType.WEBRTC);
        });
    });

    describe("dispose", () => {
        it("should finalize pending state when disposed before delay completes", () => {
            const newState = createState(CommunicationType.LIVEKIT);
            manager.transitionTo(newState);

            manager.dispose();

            expect(initialState.finalize).toHaveBeenCalled();
        });

        it("should not finalize state twice when dispose is called after delay", () => {
            const newState = createState(CommunicationType.LIVEKIT);
            manager.transitionTo(newState);
            manager.dispose();

            vi.advanceTimersByTime(FINALIZE_DELAY_MS + 10);

            expect(initialState.finalize).toHaveBeenCalledTimes(1);
        });

        it("should not throw when disposed without pending state", () => {
            expect(() => manager.dispose()).not.toThrow();
        });

        it("should handle finalize errors gracefully when disposed", () => {
            const newState = createState(CommunicationType.LIVEKIT);
            vi.mocked(initialState.finalize).mockImplementation(() => {
                throw new Error("Finalize error");
            });
            manager.transitionTo(newState);

            expect(() => manager.dispose()).not.toThrow();
        });
    });

    describe("hasPendingFinalization", () => {
        it("should return false when no transition has occurred", () => {
            expect(manager.hasPendingFinalization()).toBe(false);
        });

        it("should return true when state is pending finalization", () => {
            const newState = createState(CommunicationType.LIVEKIT);

            manager.transitionTo(newState);

            expect(manager.hasPendingFinalization()).toBe(true);
        });

        it("should return false when finalization delay has completed", () => {
            const newState = createState(CommunicationType.LIVEKIT);
            manager.transitionTo(newState);

            vi.advanceTimersByTime(FINALIZE_DELAY_MS + 10);

            expect(manager.hasPendingFinalization()).toBe(false);
        });
    });

    describe("error handling", () => {
        it("should not throw when finalize throws error during scheduled finalization", () => {
            const newState = createState(CommunicationType.LIVEKIT);
            vi.mocked(initialState.finalize).mockImplementation(() => {
                throw new Error("Finalize error");
            });
            manager.transitionTo(newState);

            expect(() => vi.advanceTimersByTime(FINALIZE_DELAY_MS + 10)).not.toThrow();
        });
    });

    describe("multiple transitions", () => {
        it("should finalize all previous states when multiple rapid transitions occur", () => {
            const state1 = createState(CommunicationType.LIVEKIT);
            const state2 = createState(CommunicationType.WEBRTC);
            const state3 = createState(CommunicationType.LIVEKIT);

            manager.transitionTo(state1);
            manager.transitionTo(state2);
            manager.transitionTo(state3);

            expect(initialState.finalize).toHaveBeenCalled();
            expect(state1.finalize).toHaveBeenCalled();
            expect(state2.finalize).not.toHaveBeenCalled();
            expect(manager.getCurrentState()).toBe(state3);

            vi.advanceTimersByTime(FINALIZE_DELAY_MS + 10);

            expect(state2.finalize).toHaveBeenCalled();
        });

        it("should maintain correct state reference when multiple transitions occur", () => {
            const states = [
                createState(CommunicationType.LIVEKIT),
                createState(CommunicationType.WEBRTC),
                createState(CommunicationType.LIVEKIT),
            ];

            for (const state of states) {
                manager.transitionTo(state);
                expect(manager.getCurrentState()).toBe(state);
            }
        });
    });
});
