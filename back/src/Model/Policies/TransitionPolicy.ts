import { CommunicationType } from "../Types/CommunicationTypes";
import type { ITransitionPolicy, LivekitAvailabilityChecker } from "../Interfaces/ITransitionPolicy";
import type { IRecordingManager } from "../RecordingManager";

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
        private readonly livekitChecker: LivekitAvailabilityChecker,
        private readonly recordingManager: IRecordingManager,
        private readonly switchOnCpuLimitation: boolean = true,
    ) {}

    /**
     * Determines if a transition should occur based on current state and user count.
     *
     * Business rules:
     * - WebRTC -> LiveKit: when user count exceeds maxUsersForWebRTC AND LiveKit is available, or when a user
     *   raised its `cpuLimited` flag in a bubble of more than two (in P2P that user runs one encoder per peer;
     *   LiveKit brings it down to one, which is worth nothing for a pair)
     * - LiveKit -> WebRTC: when user count drops to or below maxUsersForWebRTC, unless a recording is running or a
     *   `cpuLimited` user is present. The two legs are asymmetric on purpose: once a bubble moved for a flag, only
     *   that user leaving brings it back, so a third member coming and going never bounces it
     * - VoidState: no transitions
     *
     * @param currentType - The current communication type
     * @param userCount - The current number of users
     * @param cpuLimitedUserCount - How many of them raised their `cpuLimited` flag
     * @returns true if a transition should occur
     */
    shouldTransition(currentType: CommunicationType, userCount: number, cpuLimitedUserCount = 0): boolean {
        const cpuLimited = this.switchOnCpuLimitation && cpuLimitedUserCount > 0;

        if (currentType === CommunicationType.WEBRTC) {
            const shouldSwitch = userCount > this.maxUsersForWebRTC || (cpuLimited && userCount > 2);
            if (shouldSwitch && !this.livekitChecker.isAvailable()) {
                return false;
            }
            return shouldSwitch;
        }

        if (
            currentType === CommunicationType.LIVEKIT &&
            userCount <= this.maxUsersForWebRTC &&
            !this.recordingManager.isRecording &&
            !cpuLimited
        ) {
            return true;
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
