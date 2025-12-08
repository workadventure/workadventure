import { describe, expect, it } from "vitest";
import { CommunicationType } from "../src/Model/Types/CommunicationTypes";
import { TransitionPolicy } from "../src/Model/Policies/TransitionPolicy";
import { LivekitAvailabilityChecker } from "../src/Model/Interfaces/ITransitionPolicy";

describe("TransitionPolicy", () => {
    // Real implementation of LivekitAvailabilityChecker (no mock)
    const createLivekitChecker = (available: boolean): LivekitAvailabilityChecker => ({
        isAvailable: () => available,
    });

    const MAX_USERS_FOR_WEBRTC = 4;

    describe("shouldTransition", () => {
        describe("from WebRTC state", () => {
            it("should return true when user count exceeds threshold and LiveKit is available", () => {
                const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

                expect(policy.shouldTransition(CommunicationType.WEBRTC, 5)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.WEBRTC, 10)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.WEBRTC, 100)).toBe(true);
            });

            it("should return false when user count is at or below threshold", () => {
                const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

                expect(policy.shouldTransition(CommunicationType.WEBRTC, 4)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.WEBRTC, 3)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.WEBRTC, 1)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.WEBRTC, 0)).toBe(false);
            });

            it("should return false when user count exceeds threshold but LiveKit is unavailable", () => {
                const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(false));

                expect(policy.shouldTransition(CommunicationType.WEBRTC, 5)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.WEBRTC, 10)).toBe(false);
            });

            it("should return false when user count equals threshold regardless of LiveKit availability", () => {
                const policyWithLivekit = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));
                const policyWithoutLivekit = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(false));

                expect(policyWithLivekit.shouldTransition(CommunicationType.WEBRTC, 4)).toBe(false);
                expect(policyWithoutLivekit.shouldTransition(CommunicationType.WEBRTC, 4)).toBe(false);
            });
        });

        describe("from LiveKit state", () => {
            it("should return true when user count drops to or below threshold", () => {
                const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 4)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 3)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 1)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 0)).toBe(true);
            });

            it("should return false when user count exceeds threshold", () => {
                const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 5)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 10)).toBe(false);
            });

            it("should return true regardless of LiveKit availability when transitioning back to WebRTC", () => {
                const policyWithLivekit = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));
                const policyWithoutLivekit = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(false));

                expect(policyWithLivekit.shouldTransition(CommunicationType.LIVEKIT, 4)).toBe(true);
                expect(policyWithoutLivekit.shouldTransition(CommunicationType.LIVEKIT, 4)).toBe(true);
            });
        });

        describe("from NONE state (VoidState)", () => {
            it("should return false regardless of user count when in NONE state", () => {
                const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

                expect(policy.shouldTransition(CommunicationType.NONE, 0)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.NONE, 4)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.NONE, 5)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.NONE, 100)).toBe(false);
            });
        });

        describe("with custom thresholds", () => {
            it("should respect custom threshold value when threshold is 10", () => {
                const policy = new TransitionPolicy(10, createLivekitChecker(true));

                expect(policy.shouldTransition(CommunicationType.WEBRTC, 10)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.WEBRTC, 11)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 10)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 11)).toBe(false);
            });

            it("should work correctly when threshold is 1", () => {
                const policy = new TransitionPolicy(1, createLivekitChecker(true));

                expect(policy.shouldTransition(CommunicationType.WEBRTC, 1)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.WEBRTC, 2)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 1)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 2)).toBe(false);
            });

            it("should work correctly when threshold is 0", () => {
                const policy = new TransitionPolicy(0, createLivekitChecker(true));

                expect(policy.shouldTransition(CommunicationType.WEBRTC, 0)).toBe(false);
                expect(policy.shouldTransition(CommunicationType.WEBRTC, 1)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 0)).toBe(true);
                expect(policy.shouldTransition(CommunicationType.LIVEKIT, 1)).toBe(false);
            });
        });
    });

    describe("getNextStateType", () => {
        it("should return LIVEKIT when current state is WEBRTC", () => {
            const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

            expect(policy.getNextStateType(CommunicationType.WEBRTC, 5)).toBe(CommunicationType.LIVEKIT);
            expect(policy.getNextStateType(CommunicationType.WEBRTC, 4)).toBe(CommunicationType.LIVEKIT);
            expect(policy.getNextStateType(CommunicationType.WEBRTC, 100)).toBe(CommunicationType.LIVEKIT);
        });

        it("should return WEBRTC when current state is LIVEKIT", () => {
            const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

            expect(policy.getNextStateType(CommunicationType.LIVEKIT, 4)).toBe(CommunicationType.WEBRTC);
            expect(policy.getNextStateType(CommunicationType.LIVEKIT, 5)).toBe(CommunicationType.WEBRTC);
            expect(policy.getNextStateType(CommunicationType.LIVEKIT, 0)).toBe(CommunicationType.WEBRTC);
        });

        it("should return null when current state is NONE", () => {
            const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

            expect(policy.getNextStateType(CommunicationType.NONE, 0)).toBe(null);
            expect(policy.getNextStateType(CommunicationType.NONE, 5)).toBe(null);
            expect(policy.getNextStateType(CommunicationType.NONE, 100)).toBe(null);
        });

        it("should return same result regardless of LiveKit availability", () => {
            const policyWithLivekit = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));
            const policyWithoutLivekit = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(false));

            expect(policyWithLivekit.getNextStateType(CommunicationType.WEBRTC, 5)).toBe(CommunicationType.LIVEKIT);
            expect(policyWithoutLivekit.getNextStateType(CommunicationType.WEBRTC, 5)).toBe(CommunicationType.LIVEKIT);
        });
    });

    describe("pure function behavior", () => {
        it("should return same result for same inputs when called multiple times (deterministic)", () => {
            const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

            const result1 = policy.shouldTransition(CommunicationType.WEBRTC, 5);
            const result2 = policy.shouldTransition(CommunicationType.WEBRTC, 5);
            const result3 = policy.shouldTransition(CommunicationType.WEBRTC, 5);

            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
        });

        it("should not modify checker state when called multiple times", () => {
            const checker = createLivekitChecker(true);
            const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, checker);

            policy.shouldTransition(CommunicationType.WEBRTC, 5);
            policy.shouldTransition(CommunicationType.LIVEKIT, 3);
            policy.getNextStateType(CommunicationType.WEBRTC, 5);

            expect(checker.isAvailable()).toBe(true);
        });
    });

    describe("edge cases", () => {
        it("should handle negative user count when in WEBRTC state", () => {
            const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

            expect(policy.shouldTransition(CommunicationType.WEBRTC, -1)).toBe(false);
        });

        it("should handle negative user count when in LIVEKIT state", () => {
            const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

            expect(policy.shouldTransition(CommunicationType.LIVEKIT, -1)).toBe(true);
        });

        it("should handle very large user counts when in WEBRTC state", () => {
            const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

            expect(policy.shouldTransition(CommunicationType.WEBRTC, Number.MAX_SAFE_INTEGER)).toBe(true);
        });

        it("should handle very large user counts when in LIVEKIT state", () => {
            const policy = new TransitionPolicy(MAX_USERS_FOR_WEBRTC, createLivekitChecker(true));

            expect(policy.shouldTransition(CommunicationType.LIVEKIT, Number.MAX_SAFE_INTEGER)).toBe(false);
        });
    });
});
