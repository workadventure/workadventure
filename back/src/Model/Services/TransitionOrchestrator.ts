import * as Sentry from "@sentry/node";
import type { CommunicationType } from "../Types/CommunicationTypes";
import type { ICommunicationState, StateTransitionResult } from "../Interfaces/ICommunicationState";
import type {
    ITransitionOrchestrator,
    TransitionContext,
    TransitionCompleteCallback,
    TransitionErrorCallback,
} from "../Interfaces/ITransitionOrchestrator";
import { TransitionAbortedError } from "../Errors";
import { StateFactory } from "../States/StateFactory";

/**
 * Orchestrates state transitions with proper timing, cancellation, and concurrency control.
 *
 * Responsibilities:
 * - Execute immediate transitions (e.g., WebRTC -> LiveKit)
 * - Schedule delayed transitions (e.g., LiveKit -> WebRTC with delay)
 * - Handle transition cancellation
 * - Prevent concurrent transitions via locking
 */
export class TransitionOrchestrator implements ITransitionOrchestrator {
    private _pendingTransitionAbortController: AbortController | undefined;
    private _pendingTransitionTimeout: ReturnType<typeof setTimeout> | undefined;
    private _transitionLock: Promise<void> | undefined;

    constructor(private readonly delayMs: number) {}

    /**
     * Executes an immediate transition to the specified state type.
     * The transition is protected by an abort controller and validates conditions before completing.
     *
     * @param type - The target communication type
     * @param context - The transition context containing space and user information
     * @returns The new state or null if transition was aborted
     */
    async executeImmediateTransition(
        type: CommunicationType,
        context: TransitionContext
    ): Promise<ICommunicationState | null> {
        const abortController = new AbortController();
        this._pendingTransitionAbortController = abortController;

        try {
            const nextState = await StateFactory.createState(
                type,
                context.space,
                context.users,
                context.usersToNotify,
                { playUri: context.playUri }
            );

            // Check if aborted during async state creation
            if (abortController.signal.aborted) {
                return null;
            }

            this._pendingTransitionAbortController = undefined;
            return nextState;
        } catch (error) {
            if (error instanceof TransitionAbortedError || abortController.signal.aborted) {
                // Silently handle abort - this is normal when conditions change
                return null;
            }
            const errorMessage = error instanceof Error ? error : new Error(String(error));
            console.error("Error while executing immediate transition:", errorMessage);
            Sentry.captureException(errorMessage);
            return null;
        } finally {
            if (this._pendingTransitionAbortController === abortController) {
                this._pendingTransitionAbortController = undefined;
            }
        }
    }

    /**
     * Schedules a delayed transition to the specified state type.
     * The transition can be cancelled before the delay completes.
     *
     * @param type - The target communication type
     * @param context - The transition context
     * @param onComplete - Callback when transition completes successfully
     * @param onError - Optional callback when transition fails
     * @returns A StateTransitionResult with abort controller
     */
    scheduleDelayedTransition(
        type: CommunicationType,
        context: TransitionContext,
        onComplete: TransitionCompleteCallback,
        onError?: TransitionErrorCallback
    ): StateTransitionResult {
        // If a transition is already scheduled, return the existing abort controller
        if (this._pendingTransitionAbortController && this._pendingTransitionTimeout) {
            return {
                abortController: this._pendingTransitionAbortController,
            };
        }

        // Create new abort controller for this transition
        const abortController = new AbortController();
        this._pendingTransitionAbortController = abortController;

        // Create promise that resolves after delay, unless aborted
        const nextStatePromise = new Promise<ICommunicationState>((resolve, reject) => {
            this._pendingTransitionTimeout = setTimeout(() => {
                // Use void to explicitly ignore the promise returned by async function
                void (async () => {
                    if (abortController.signal.aborted) {
                        reject(new TransitionAbortedError());
                        return;
                    }

                    try {
                        const nextState = await StateFactory.createState(
                            type,
                            context.space,
                            context.users,
                            context.usersToNotify,
                            { playUri: context.playUri }
                        );

                        // Final check before resolving
                        if (abortController.signal.aborted) {
                            this.clearPendingTransition();
                            reject(new TransitionAbortedError());
                            return;
                        }

                        this.clearPendingTransition();
                        resolve(nextState);
                    } catch (error) {
                        this.clearPendingTransition();
                        const errorToReject = error instanceof Error ? error : new Error(String(error));
                        reject(errorToReject);
                    }
                })();
            }, this.delayMs);

            // Listen for abort signal
            abortController.signal.addEventListener("abort", () => {
                if (this._pendingTransitionTimeout) {
                    clearTimeout(this._pendingTransitionTimeout);
                    this._pendingTransitionTimeout = undefined;
                }
                if (this._pendingTransitionAbortController === abortController) {
                    this._pendingTransitionAbortController = undefined;
                }
                reject(new TransitionAbortedError());
            });
        });

        // Wait for the promise and invoke callback when ready
        nextStatePromise
            .then((nextState) => {
                onComplete(nextState);
            })
            .catch((error) => {
                if (!(error instanceof TransitionAbortedError)) {
                    const errorMessage = error instanceof Error ? error : new Error(String(error));
                    console.error("Error while executing scheduled transition:", errorMessage);
                    Sentry.captureException(errorMessage);
                    onError?.(errorMessage);
                }
            });

        return {
            nextStatePromise,
            abortController,
        };
    }

    /**
     * Cancels any pending transition.
     */
    cancelPendingTransition(): void {
        if (this._pendingTransitionAbortController) {
            this._pendingTransitionAbortController.abort();
            this._pendingTransitionAbortController = undefined;
        }

        if (this._pendingTransitionTimeout) {
            clearTimeout(this._pendingTransitionTimeout);
            this._pendingTransitionTimeout = undefined;
        }
    }

    /**
     * Checks if there is a pending transition.
     */
    hasPendingTransition(): boolean {
        return this._pendingTransitionAbortController !== undefined || this._pendingTransitionTimeout !== undefined;
    }

    /**
     * Waits for any ongoing transition lock to be released.
     */
    async waitForTransitionLock(): Promise<void> {
        if (this._transitionLock) {
            await this._transitionLock;
        }
    }

    /**
     * Sets a transition lock that must be awaited before executing another transition.
     * @param lockPromise - The promise to set as the lock
     */
    setTransitionLock(lockPromise: Promise<void>): void {
        this._transitionLock = lockPromise;
    }

    /**
     * Clears the transition lock.
     */
    clearTransitionLock(): void {
        this._transitionLock = undefined;
    }

    /**
     * Disposes of all resources (timeouts, abort controllers).
     */
    dispose(): void {
        this.cancelPendingTransition();
        this._transitionLock = undefined;
    }

    /**
     * Clears pending transition state.
     */
    private clearPendingTransition(): void {
        this._pendingTransitionAbortController = undefined;
        this._pendingTransitionTimeout = undefined;
    }
}
