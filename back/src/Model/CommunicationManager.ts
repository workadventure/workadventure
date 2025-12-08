import * as Sentry from "@sentry/node";
import type { SpaceUser } from "@workadventure/messages";
import { getCapability } from "../Services/Capabilities";
import { MAX_USERS_FOR_WEBRTC, LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../Enum/EnvironmentVariable";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import type { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import type { ICommunicationState, StateTransitionResult } from "./Interfaces/ICommunicationState";
import { CommunicationType } from "./Types/CommunicationTypes";
import { StateFactory } from "./States/StateFactory";
import { TransitionAbortedError } from "./Errors";
import { WebRTCState } from "./States/WebRTCState";
import { VoidState } from "./States/VoidState";

export class CommunicationManager implements ICommunicationManager {
    private _currentState: ICommunicationState;
    private _toFinalizeState: ICommunicationState | undefined;
    private _finalizeStateTimeout: ReturnType<typeof setTimeout> | undefined;
    private _pendingTransitionAbortController: AbortController | undefined;
    private _pendingTransitionTimeout: ReturnType<typeof setTimeout> | undefined;
    private _transitionLock: Promise<void> | undefined;
    private users: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private usersToNotify: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private readonly LIVEKIT_TO_WEBRTC_DELAY_MS = 20_000; // 20 seconds

    constructor(private readonly space: ICommunicationSpace) {
        // Initialize state synchronously for constructor
        // This is safe because getInitialState() doesn't need async for VoidState
        // and WebRTCState creation is synchronous
        const propertiesToSync = this.space.getPropertiesToSync();
        const stateType = this.hasMediaProperties(propertiesToSync) ? CommunicationType.WEBRTC : CommunicationType.NONE;

        // Create states synchronously (WebRTCState and VoidState constructors are sync)
        // LiveKit state creation is async but not used in initial state
        if (stateType === CommunicationType.WEBRTC) {
            this._currentState = new WebRTCState(this.space, this.users, this.usersToNotify);
        } else {
            this._currentState = new VoidState();
        }
        this._currentState.init();
    }

    public async handleUserAdded(user: SpaceUser): Promise<void> {
        this.users.set(user.spaceUserId, user);

        // Cancel pending transition if conditions no longer allow switching
        this.cancelPendingTransitionIfNeeded();

        // Ensure user is notified of current communication type and added to the current state
        await this._currentState.handleUserAdded(user);

        // Check if transition is needed after user addition
        await this.evaluateAndHandleTransition(user);
    }

    public async handleUserDeleted(user: SpaceUser): Promise<void> {
        this.users.delete(user.spaceUserId);

        // Cancel pending transition if conditions no longer allow switching
        this.cancelPendingTransitionIfNeeded();

        await this._currentState.handleUserDeleted(user);

        // Check if transition is needed after user deletion
        await this.evaluateAndHandleTransition(user);
    }

    public async handleUserUpdated(user: SpaceUser): Promise<void> {
        await this._currentState.handleUserUpdated(user);
    }

    public async handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        this.usersToNotify.set(user.spaceUserId, user);

        // Cancel pending transition if conditions no longer allow switching
        this.cancelPendingTransitionIfNeeded();

        await this._currentState.handleUserToNotifyAdded(user);

        // Check if transition is needed after user to notify addition
        await this.evaluateAndHandleTransition(user);
    }

    public async handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        this.usersToNotify.delete(user.spaceUserId);

        // Cancel pending transition if conditions no longer allow switching
        this.cancelPendingTransitionIfNeeded();

        await this._currentState.handleUserToNotifyDeleted(user);

        // Check if transition is needed after user to notify deletion
        await this.evaluateAndHandleTransition(user);
    }

    /**
     * Evaluates if a transition is needed and handles it accordingly.
     * This centralizes all business logic for state transitions.
     */
    private async evaluateAndHandleTransition(user: SpaceUser): Promise<void> {
        // Wait for any ongoing transition to complete
        if (this._transitionLock) {
            await this._transitionLock;
        }

        // Check if transition is needed based on current state and conditions
        if (!this.shouldSwitchToNextState()) {
            return;
        }

        const nextStateType = this.getNextStateType();
        if (!nextStateType) {
            return;
        }

        // Execute transition with lock to prevent concurrent transitions
        this._transitionLock = this.executeTransition(nextStateType, user);
        try {
            await this._transitionLock;
        } finally {
            this._transitionLock = undefined;
        }
    }

    /**
     * Executes a state transition to the specified type.
     * Protected by transition lock to prevent race conditions.
     */
    private async executeTransition(nextStateType: CommunicationType, user: SpaceUser): Promise<void> {
        // Cancel any existing pending transition
        this.cancelPendingTransitionIfNeeded();

        // Handle different transition types
        if (nextStateType === CommunicationType.LIVEKIT) {
            // Immediate transition to LiveKit (async creation)
            await this.transitionToLiveKit(user);
        } else if (nextStateType === CommunicationType.WEBRTC) {
            // Delayed transition to WebRTC
            this.scheduleTransitionToWebRTC();
        }
    }

    /**
     * Transitions to LiveKit state.
     * Creates the state asynchronously and validates before switching.
     */
    private async transitionToLiveKit(user: SpaceUser): Promise<void> {
        const abortController = new AbortController();
        this._pendingTransitionAbortController = abortController;

        try {
            const nextState: ICommunicationState = await StateFactory.createState(
                CommunicationType.LIVEKIT,
                this.space,
                this.users,
                this.usersToNotify,
                { playUri: user.playUri }
            );

            // Atomic validation: check conditions just before switching
            if (abortController.signal.aborted || !this.shouldSwitchToNextState()) {
                return;
            }

            const expectedNextType = this.getNextStateType();
            if (expectedNextType && nextState.communicationType !== expectedNextType) {
                return;
            }

            this.setState(nextState);
            this._pendingTransitionAbortController = undefined;
        } catch (error) {
            if (error instanceof TransitionAbortedError || abortController.signal.aborted) {
                // Silently handle abort - this is normal when conditions change
                return;
            }
            const errorMessage = error instanceof Error ? error : new Error(String(error));
            console.error("Error while transitioning to LiveKit:", errorMessage);
            Sentry.captureException(errorMessage);
        } finally {
            if (this._pendingTransitionAbortController === abortController) {
                this._pendingTransitionAbortController = undefined;
            }
        }
    }

    /**
     * Schedules a delayed transition from LiveKit to WebRTC.
     * Returns a StateTransitionResult that can be used to cancel the transition.
     */
    private scheduleTransitionToWebRTC(): StateTransitionResult {
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

                    // Atomic validation: verify we should still switch before resolving
                    if (!this.shouldSwitchToNextState()) {
                        this._pendingTransitionAbortController = undefined;
                        this._pendingTransitionTimeout = undefined;
                        reject(new TransitionAbortedError("Transition conditions no longer met"));
                        return;
                    }

                    try {
                        const nextState: ICommunicationState = await StateFactory.createState(
                            CommunicationType.WEBRTC,
                            this.space,
                            this.users,
                            this.usersToNotify
                        );

                        // Final atomic check before switching
                        if (abortController.signal.aborted || !this.shouldSwitchToNextState()) {
                            this._pendingTransitionAbortController = undefined;
                            this._pendingTransitionTimeout = undefined;
                            reject(new TransitionAbortedError());
                            return;
                        }

                        const expectedNextType = this.getNextStateType();
                        if (expectedNextType && nextState.communicationType !== expectedNextType) {
                            this._pendingTransitionAbortController = undefined;
                            this._pendingTransitionTimeout = undefined;
                            reject(new TransitionAbortedError("Transition conditions no longer met"));
                            return;
                        }

                        this._pendingTransitionAbortController = undefined;
                        this._pendingTransitionTimeout = undefined;
                        resolve(nextState);
                    } catch (error) {
                        this._pendingTransitionAbortController = undefined;
                        this._pendingTransitionTimeout = undefined;
                        const errorToReject = error instanceof Error ? error : new Error(String(error));
                        reject(errorToReject);
                    }
                })();
            }, this.LIVEKIT_TO_WEBRTC_DELAY_MS);

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

        // Wait for the promise and set state when ready
        nextStatePromise
            .then((nextState) => {
                // Final validation before setting state
                if (this.shouldSwitchToNextState()) {
                    const expectedNextType = this.getNextStateType();
                    if (!expectedNextType || nextState.communicationType === expectedNextType) {
                        this.setState(nextState);
                    }
                }
            })
            .catch((error) => {
                if (!(error instanceof TransitionAbortedError)) {
                    const errorMessage = error instanceof Error ? error : new Error(String(error));
                    console.error("Error while executing scheduled transition to WebRTC:", errorMessage);
                    Sentry.captureException(errorMessage);
                }
            });

        return {
            nextStatePromise,
            abortController,
        };
    }

    /**
     * Centralized business logic: determines if we should switch to the next state.
     * Based on current state type and user count.
     */
    private shouldSwitchToNextState(): boolean {
        const currentType = this._currentState.communicationType;
        const userCount = this.space.getAllUsers().length;

        if (currentType === CommunicationType.WEBRTC) {
            // Switch to LiveKit if user count exceeds threshold
            const shouldSwitch = userCount > MAX_USERS_FOR_WEBRTC;
            if (shouldSwitch && !this.isLivekitAvailable()) {
                console.warn(
                    "Livekit is not configured in environment variables (or in AdminAPI), cannot switch to Livekit"
                );
                return false;
            }
            return shouldSwitch;
        } else if (currentType === CommunicationType.LIVEKIT) {
            // Switch to WebRTC if user count is below threshold
            return userCount <= MAX_USERS_FOR_WEBRTC;
        }

        // VoidState or unknown state: no transition
        return false;
    }

    /**
     * Centralized business logic: determines the next state type based on current state.
     */
    private getNextStateType(): CommunicationType | null {
        const currentType = this._currentState.communicationType;

        if (currentType === CommunicationType.WEBRTC) {
            return CommunicationType.LIVEKIT;
        } else if (currentType === CommunicationType.LIVEKIT) {
            return CommunicationType.WEBRTC;
        }

        return null;
    }

    /**
     * Checks if LiveKit is available (configured).
     */
    private isLivekitAvailable(): boolean {
        return (
            getCapability("api/livekit/credentials") === "v1" ||
            (!!LIVEKIT_HOST && !!LIVEKIT_API_KEY && !!LIVEKIT_API_SECRET)
        );
    }

    /**
     * Cancels pending transition if conditions no longer allow switching.
     * This ensures transitions are cancelled when business rules no longer allow them.
     */
    private cancelPendingTransitionIfNeeded(): void {
        if (!this._pendingTransitionAbortController) {
            return;
        }

        // If we should no longer switch, cancel pending transition
        if (!this.shouldSwitchToNextState()) {
            this._pendingTransitionAbortController.abort();
            this._pendingTransitionAbortController = undefined;

            if (this._pendingTransitionTimeout) {
                clearTimeout(this._pendingTransitionTimeout);
                this._pendingTransitionTimeout = undefined;
            }
        }
    }

    /**
     * Sets the current communication state.
     * After 5 seconds, the previous state will be finalized.
     * If a new state is set before the timeout, the previous state will be finalized immediately.
     */
    private setState(state: ICommunicationState): void {
        if (this._toFinalizeState) {
            this.finalizeState(this._toFinalizeState);
            if (this._finalizeStateTimeout) {
                clearTimeout(this._finalizeStateTimeout);
                this._finalizeStateTimeout = undefined;
            }
        }
        this._toFinalizeState = this._currentState;
        this._currentState = state;

        // Dispatch the new state to all users
        this._toFinalizeState.switchState(state.communicationType);

        // We initialize the new state after having dispatched the switch event so that the objects listening
        // to the state change event are ready on the front side.
        state.init();

        this._finalizeStateTimeout = setTimeout(() => {
            if (this._toFinalizeState) {
                try {
                    this.finalizeState(this._toFinalizeState);
                } catch (error) {
                    console.error("Error while finalizing state:", error);
                    Sentry.captureException(error);
                }
            }
            this._finalizeStateTimeout = undefined;
            this._toFinalizeState = undefined;
        }, 5000);
    }

    private hasMediaProperties(properties: string[]): boolean {
        return properties.some((prop) => ["cameraState", "microphoneState", "screenSharingState"].includes(prop));
    }

    private finalizeState(toFinalizeState: ICommunicationState) {
        toFinalizeState.finalize();
    }
}

export const CommunicationConfig = {
    MAX_USERS_FOR_WEBRTC,
};
