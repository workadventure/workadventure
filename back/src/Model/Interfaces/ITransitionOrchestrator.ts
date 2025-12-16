import type { SpaceUser } from "@workadventure/messages";
import type { CommunicationType } from "../Types/CommunicationTypes";
import type { ICommunicationState, StateTransitionResult } from "./ICommunicationState";
import type { ICommunicationSpace } from "./ICommunicationSpace";

/**
 * Context required for executing a state transition.
 */
export interface TransitionContext {
    space: ICommunicationSpace;
    users: ReadonlyMap<string, SpaceUser>;
    usersToNotify: ReadonlyMap<string, SpaceUser>;
    playUri?: string;
}

/**
 * Callback invoked when a transition completes successfully.
 */
export type TransitionCompleteCallback = (state: ICommunicationState) => void;

/**
 * Callback invoked when a transition fails.
 */
export type TransitionErrorCallback = (error: Error) => void;

/**
 * Interface for orchestrating state transitions.
 * Handles timing, cancellation, and concurrency of transitions.
 */
export interface ITransitionOrchestrator {
    /**
     * Executes an immediate transition to the specified state type.
     * @param type - The target communication type
     * @param context - The transition context
     * @returns The new state or null if transition was aborted
     */
    executeImmediateTransition(
        type: CommunicationType,
        context: TransitionContext
    ): Promise<ICommunicationState | null>;

    /**
     * Schedules a delayed transition to the specified state type.
     * @param type - The target communication type
     * @param context - The transition context
     * @param onComplete - Callback when transition completes
     * @param onError - Optional callback when transition fails
     * @returns A StateTransitionResult with abort controller
     */
    scheduleDelayedTransition(
        type: CommunicationType,
        context: TransitionContext,
        onComplete: TransitionCompleteCallback,
        onError?: TransitionErrorCallback
    ): StateTransitionResult;

    /**
     * Cancels any pending transition.
     */
    cancelPendingTransition(): void;

    /**
     * Checks if there is a pending transition.
     */
    hasPendingTransition(): boolean;

    /**
     * Waits for any ongoing transition lock to be released.
     */
    waitForTransitionLock(): Promise<void>;

    /**
     * Sets a transition lock that must be awaited before executing another transition.
     */
    setTransitionLock(lockPromise: Promise<void>): void;

    /**
     * Clears the transition lock.
     */
    clearTransitionLock(): void;

    /**
     * Disposes of all resources (timeouts, abort controllers).
     */
    dispose(): void;
}
