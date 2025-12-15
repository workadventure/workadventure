import type { ICommunicationState } from "./ICommunicationState";

/**
 * Interface for managing the lifecycle of communication states.
 * Handles initialization and deferred finalization of states.
 */
export interface IStateLifecycleManager {
    /**
     * Returns the current active communication state.
     */
    getCurrentState(): ICommunicationState;

    /**
     * Transitions to a new state.
     * Handles:
     * - Finalizing the previous state (if any) immediately
     * - Setting the new state as current
     * - Dispatching switch events to users
     * - Initializing the new state
     * - Scheduling deferred finalization of the old state
     */
    transitionTo(newState: ICommunicationState): void;

    /**
     * Dispatches a switch event from the previous state.
     * @param targetCommunicationType - The type being switched to
     */
    dispatchSwitchEvent(targetCommunicationType: string): void;

    /**
     * Disposes of all resources (timeouts) and finalizes pending states.
     */
    dispose(): void;
}
