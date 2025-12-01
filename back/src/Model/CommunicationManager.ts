import * as Sentry from "@sentry/node";
import type { SpaceUser } from "@workadventure/messages";
import { MAX_USERS_FOR_WEBRTC } from "../Enum/EnvironmentVariable";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { WebRTCState } from "./States/WebRTCState";
import type { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import type { ICommunicationState, StateTransitionResult } from "./Interfaces/ICommunicationState";
import { VoidState } from "./States/VoidState";

export class CommunicationManager implements ICommunicationManager {
    private _currentState: ICommunicationState;
    private _toFinalizeState: ICommunicationState | undefined;
    private _finalizeStateTimeout: ReturnType<typeof setTimeout> | undefined;
    private _pendingTransitionAbortController: AbortController | undefined;
    private users: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private usersToNotify: Map<string, SpaceUser> = new Map<string, SpaceUser>();

    constructor(private readonly space: ICommunicationSpace) {
        this._currentState = this.getInitialState();
    }

    public async handleUserAdded(user: SpaceUser): Promise<void> {
        this.users.set(user.spaceUserId, user);

        // Cancel pending transition if state validation fails
        this.cancelPendingTransitionIfInvalid();

        // Ensure user is notified of current communication type and added to the current state
        // This is important during transition periods to ensure the user joins the correct communication system
        const result = await this._currentState.handleUserAdded(user);
        await this.handleStateTransitionResult(result);
    }

    public async handleUserDeleted(user: SpaceUser): Promise<void> {
        this.users.delete(user.spaceUserId);

        // Cancel pending transition if state validation fails
        this.cancelPendingTransitionIfInvalid();

        const result = await this._currentState.handleUserDeleted(user);
        await this.handleStateTransitionResult(result);
    }

    public async handleUserUpdated(user: SpaceUser): Promise<void> {
        const result = await this._currentState.handleUserUpdated(user);
        await this.handleStateTransitionResult(result);
    }

    public async handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        this.usersToNotify.set(user.spaceUserId, user);

        // Cancel pending transition if state validation fails
        this.cancelPendingTransitionIfInvalid();

        const result = await this._currentState.handleUserToNotifyAdded(user);
        await this.handleStateTransitionResult(result);
    }

    public async handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        this.usersToNotify.delete(user.spaceUserId);
        const result = await this._currentState.handleUserToNotifyDeleted(user);
        await this.handleStateTransitionResult(result);
    }

    /**
     * Handles the result from state transition methods.
     * Processes both direct state returns and StateTransitionResult with promises/abort controllers.
     */
    private async handleStateTransitionResult(
        result: StateTransitionResult | ICommunicationState | void
    ): Promise<void> {
        if (!result) {
            return;
        }

        // Handle StateTransitionResult with promise and abort controller
        if (this.isStateTransitionResult(result)) {
            const transitionResult: StateTransitionResult = result;
            // Store abort controller for potential cancellation
            if (transitionResult.abortController) {
                // Cancel previous pending transition if exists
                if (this._pendingTransitionAbortController) {
                    this._pendingTransitionAbortController.abort();
                }
                this._pendingTransitionAbortController = transitionResult.abortController;
            }

            // If there's a promise, wait for it and then switch
            if (transitionResult.nextStatePromise) {
                try {
                    const nextState = await transitionResult.nextStatePromise;
                    // Validate transition before executing
                    //TODO : voir si utile quand on aura plusieurs state et pas forcement d'ordre de switch.
                    if (this.validateStateTransition(nextState)) {
                        this.setState(nextState);
                        this._pendingTransitionAbortController = undefined;
                    }
                } catch (error) {
                    // Transition was aborted or failed - this is expected behavior
                    if (error instanceof Error && error.message === "Transition aborted") {
                        // Silently handle abort - this is normal when conditions change
                        return;
                    }
                    console.error("Error while executing state transition:", error);
                    Sentry.captureException(error);
                }
            }
            return;
        }

        // Handle direct state return (immediate transition)
        const directState: ICommunicationState = result;
        if (this.validateStateTransition(directState)) {
            // Cancel any pending transition
            if (this._pendingTransitionAbortController) {
                this._pendingTransitionAbortController.abort();
                this._pendingTransitionAbortController = undefined;
            }
            this.setState(directState);
        }
    }

    /**
     * Validates that a state transition should still proceed.
     * Uses the current state's shouldSwitchToNextState() method to check if conditions are still met.
     */
    private validateStateTransition(nextState: ICommunicationState): boolean {
        // If current state says we should switch, proceed
        if (this._currentState.shouldSwitchToNextState()) {
            const nextStateType = this._currentState.getNextStateType();
            // Verify the next state matches what current state expects
            if (nextStateType && nextState.communicationType === nextStateType) {
                return true;
            }
            // If no specific next state type is expected, allow the transition
            if (!nextStateType) {
                return true;
            }
        }
        return false;
    }

    /**
     * Cancels pending transition if current state validation fails.
     * This ensures transitions are cancelled when business rules no longer allow them.
     */
    private cancelPendingTransitionIfInvalid(): void {
        if (!this._pendingTransitionAbortController) {
            return;
        }

        // If current state says we should NOT switch, cancel pending transition
        if (!this._currentState.shouldSwitchToNextState()) {
            this._pendingTransitionAbortController.abort();
            this._pendingTransitionAbortController = undefined;
        }
    }

    /**
     * Type guard to check if result is a StateTransitionResult.
     */
    private isStateTransitionResult(
        result: StateTransitionResult | ICommunicationState | void
    ): result is StateTransitionResult {
        if (!result || result === null || typeof result !== "object") {
            return false;
        }
        // StateTransitionResult has optional nextStatePromise or abortController
        // ICommunicationState has communicationType getter
        const hasTransitionProperties = "nextStatePromise" in result || "abortController" in result;
        const hasCommunicationType = "communicationType" in result && typeof result.communicationType === "string";
        // If it has transition properties but not communicationType, it's a StateTransitionResult
        // If it has communicationType, it's an ICommunicationState
        return hasTransitionProperties && !hasCommunicationType;
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

    private getInitialState(): ICommunicationState {
        const propertiesToSync = this.space.getPropertiesToSync();
        const state: ICommunicationState = this.hasMediaProperties(propertiesToSync)
            ? new WebRTCState(this.space, this.users, this.usersToNotify)
            : new VoidState();
        state.init();
        return state;
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
