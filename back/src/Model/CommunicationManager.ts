import * as Sentry from "@sentry/node";
import type { SpaceUser } from "@workadventure/messages";
import { MAX_USERS_FOR_WEBRTC } from "../Enum/EnvironmentVariable";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { WebRTCState } from "./States/WebRTCState";
import type { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import type { ICommunicationState } from "./Interfaces/ICommunicationState";
import { VoidState } from "./States/VoidState";
import { CommunicationType } from "./Types/CommunicationTypes";

export class CommunicationManager implements ICommunicationManager {
    private _currentState: ICommunicationState;
    private _toFinalizeState: ICommunicationState | undefined;
    private _finalizeStateTimeout: ReturnType<typeof setTimeout> | undefined;
    private _pendingStateSwitch: ICommunicationState | undefined;
    private _pendingStateSwitchTimeout: ReturnType<typeof setTimeout> | undefined;
    private users: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private usersToNotify: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private readonly LIVEKIT_TO_WEBRTC_DELAY_MS = 20000; // 20 seconds

    constructor(private readonly space: ICommunicationSpace) {
        this._currentState = this.getInitialState();
    }

    public async handleUserAdded(user: SpaceUser): Promise<void> {
        this.users.set(user.spaceUserId, user);

        // Cancel pending state switch if conditions are met to stay in LiveKit
        this.cancelPendingStateSwitchIfNeeded();

        // Ensure user is notified of current communication type and added to the current state
        // This is important during transition periods to ensure the user joins the correct communication system
        const nextState = await this._currentState.handleUserAdded(user);
        if (nextState) {
            this.scheduleStateSwitch(nextState);
        }
    }

    public async handleUserDeleted(user: SpaceUser): Promise<void> {
        this.users.delete(user.spaceUserId);
        const nextState = await this._currentState.handleUserDeleted(user);
        if (nextState) {
            this.scheduleStateSwitch(nextState);
        }
    }

    public async handleUserUpdated(user: SpaceUser): Promise<void> {
        const nextState = await this._currentState.handleUserUpdated(user);
        if (nextState) {
            this.scheduleStateSwitch(nextState);
        }
    }

    public async handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        this.usersToNotify.set(user.spaceUserId, user);

        // Cancel pending state switch if conditions are met to stay in LiveKit
        this.cancelPendingStateSwitchIfNeeded();

        const nextState = await this._currentState.handleUserToNotifyAdded(user);
        if (nextState) {
            this.scheduleStateSwitch(nextState);
        }
    }

    public async handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        this.usersToNotify.delete(user.spaceUserId);
        const nextState = await this._currentState.handleUserToNotifyDeleted(user);
        if (nextState) {
            this.scheduleStateSwitch(nextState);
        }
    }

    /**
     * Schedules a state switch. If switching from LiveKit to WebRTC, applies a 20-second delay.
     * If a user is added during the delay, the switch is cancelled.
     * If a second nextState is received while a switch is already scheduled, the first one is kept.
     */
    private scheduleStateSwitch(nextState: ICommunicationState): void {
        const currentType = this._currentState.communicationType;
        const nextType = nextState.communicationType;

        // Check if we're switching from LiveKit to WebRTC
        const isLivekitToWebRTC = currentType === CommunicationType.LIVEKIT && nextType === CommunicationType.WEBRTC;

        if (isLivekitToWebRTC) {
            // If a switch is already scheduled, don't override it - keep the first one
            if (this._pendingStateSwitch && this._pendingStateSwitchTimeout) {
                this._pendingStateSwitch = nextState;
                return;
            }

            // Schedule the switch with a 20-second delay
            this._pendingStateSwitch = nextState;
            this._pendingStateSwitchTimeout = setTimeout(() => {
                try {
                    if (this._pendingStateSwitch) {
                        this.setState(this._pendingStateSwitch);
                        this._pendingStateSwitch = undefined;
                    }
                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error("Error while executing pending state switch:", err);
                    Sentry.captureException(err);
                } finally {
                    this._pendingStateSwitchTimeout = undefined;
                }
            }, this.LIVEKIT_TO_WEBRTC_DELAY_MS);
        } else {
            // For other transitions, switch immediately
            this.cancelPendingStateSwitch();
            this.setState(nextState);
        }
    }

    /**
     * Cancels a pending state switch unconditionally.
     * Used when scheduling a new switch to replace an existing pending one.
     */
    private cancelPendingStateSwitch(): void {
        if (this._pendingStateSwitchTimeout) {
            clearTimeout(this._pendingStateSwitchTimeout);
            this._pendingStateSwitchTimeout = undefined;
            this._pendingStateSwitch = undefined;
        }
    }

    /**
     * Cancels a pending state switch if conditions are met to stay in LiveKit.
     * Only cancels if:
     * - We're currently in LiveKit state
     * - There's a pending switch to WebRTC
     * - The number of users exceeds MAX_USERS_FOR_WEBRTC (meaning we should stay in LiveKit)
     *
     * If the number of users is still <= MAX_USERS_FOR_WEBRTC, the switch is NOT cancelled
     * and will proceed after the 20-second delay.
     */
    private cancelPendingStateSwitchIfNeeded(): void {
        // Only cancel if there's a pending switch from LiveKit to WebRTC
        if (!this._pendingStateSwitch || !this._pendingStateSwitchTimeout) {
            return;
        }

        const currentType = this._currentState.communicationType;
        const pendingType = this._pendingStateSwitch.communicationType;

        // Only cancel if switching from LiveKit to WebRTC
        if (currentType !== CommunicationType.LIVEKIT || pendingType !== CommunicationType.WEBRTC) {
            return;
        }

        // Check if we should stay in LiveKit (number of users > MAX_USERS_FOR_WEBRTC)
        // If totalUsers <= MAX_USERS_FOR_WEBRTC, we do NOT cancel (switch will proceed)
        const totalUsers = this.space.getAllUsers().length;
        const shouldStayInLivekit = totalUsers > Number(MAX_USERS_FOR_WEBRTC);

        if (shouldStayInLivekit) {
            this.cancelPendingStateSwitch();
        }
        // If shouldStayInLivekit is false (totalUsers <= MAX_USERS_FOR_WEBRTC),
        // we do nothing and let the switch proceed after the delay
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
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error("Error while finalizing state:", err);
                    Sentry.captureException(err);
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
