import { CommunicationType } from "../Types/CommunicationTypes";
import type { ITransitionPolicy, LivekitAvailabilityChecker } from "../Interfaces/ITransitionPolicy";

/**
 * Pure logic class for determining state transition decisions.
 * No side effects - only pure functions based on input parameters.
 *
 * This class encapsulates the business rules for transitioning between
 * WebRTC and LiveKit communication modes based on user count thresholds.
 */
export class TransitionPolicy implements ITransitionPolicy {
    constructor(
        private readonly maxUsersForWebRTC: number,
        private readonly livekitChecker: LivekitAvailabilityChecker
    ) {}

    /**
     * Determines if a transition should occur based on current state and user count.
     *
     * Business rules:
     * - WebRTC -> LiveKit: when user count exceeds maxUsersForWebRTC AND LiveKit is available
     * - LiveKit -> WebRTC: when user count drops to or below maxUsersForWebRTC
     * - VoidState: no transitions
     *
     * @param currentType - The current communication type
     * @param userCount - The current number of users
     * @returns true if a transition should occur
     */
    shouldTransition(currentType: CommunicationType, userCount: number): boolean {
        if (currentType === CommunicationType.WEBRTC) {
            const shouldSwitch = userCount > this.maxUsersForWebRTC;
            if (shouldSwitch && !this.livekitChecker.isAvailable()) {
                return false;
            }
            return shouldSwitch;
        }

        if (currentType === CommunicationType.LIVEKIT) {
            return userCount <= this.maxUsersForWebRTC;
        }

        // VoidState or unknown state: no transition
        return false;
    }

    /**
     * Determines the next state type based on current state and user count.
     *
     * @param currentType - The current communication type
     * @param _userCount - The current number of users (unused in current implementation, kept for interface compatibility)
     * @returns The next communication type or null if no transition should occur
     */
    getNextStateType(currentType: CommunicationType, _userCount: number): CommunicationType | null {
        if (currentType === CommunicationType.WEBRTC) {
            return CommunicationType.LIVEKIT;
        }

        if (currentType === CommunicationType.LIVEKIT) {
            return CommunicationType.WEBRTC;
        }

        return null;
    }
}
