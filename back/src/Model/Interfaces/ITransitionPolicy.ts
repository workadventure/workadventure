import type { CommunicationType } from "../Types/CommunicationTypes";

/**
 * Interface for checking LiveKit availability.
 * Used for dependency inversion in TransitionPolicy.
 */
export interface LivekitAvailabilityChecker {
    isAvailable(): boolean;
}

/**
 * Interface for determining state transition logic.
 * This is a pure logic component with no side effects.
 */
export interface ITransitionPolicy {
    /**
     * Determines if a transition should occur based on current state and user count.
     * @param currentType - The current communication type
     * @param userCount - The current number of users
     * @returns true if a transition should occur
     */
    shouldTransition(currentType: CommunicationType, userCount: number): boolean;

    /**
     * Determines the next state type based on current state and user count.
     * @param currentType - The current communication type
     * @param userCount - The current number of users
     * @returns The next communication type or null if no transition should occur
     */
    getNextStateType(currentType: CommunicationType, userCount: number): CommunicationType | null;
}
