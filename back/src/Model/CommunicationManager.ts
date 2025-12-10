import * as Sentry from "@sentry/node";
import { MeetingConnectionRestartMessage, SpaceUser } from "@workadventure/messages";
import { MAX_USERS_FOR_WEBRTC } from "../Enum/EnvironmentVariable";
import { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { WebRTCState } from "./States/WebRTCState";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import { ICommunicationState } from "./Interfaces/ICommunicationState";
import { VoidState } from "./States/VoidState";

export class CommunicationManager implements ICommunicationManager {
    private _currentState: ICommunicationState;
    private _toFinalizeState: ICommunicationState | undefined;
    private _finalizeStateTimeout: ReturnType<typeof setTimeout> | undefined;
    private users: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private usersToNotify: Map<string, SpaceUser> = new Map<string, SpaceUser>();

    constructor(private readonly space: ICommunicationSpace) {
        this._currentState = this.getInitialState();
    }

    public async handleUserAdded(user: SpaceUser): Promise<void> {
        this.users.set(user.spaceUserId, user);
        const nextState = await this._currentState.handleUserAdded(user);
        if (nextState) {
            this.setState(nextState);
        }
    }

    public async handleUserDeleted(user: SpaceUser): Promise<void> {
        this.users.delete(user.spaceUserId);
        const nextState = await this._currentState.handleUserDeleted(user);
        if (nextState) {
            this.setState(nextState);
        }
    }

    public async handleUserUpdated(user: SpaceUser): Promise<void> {
        const nextState = await this._currentState.handleUserUpdated(user);
        if (nextState) {
            this.setState(nextState);
        }
    }

    public async handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        this.usersToNotify.set(user.spaceUserId, user);
        const nextState = await this._currentState.handleUserToNotifyAdded(user);
        if (nextState) {
            this.setState(nextState);
        }
    }

    public async handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        this.usersToNotify.delete(user.spaceUserId);
        const nextState = await this._currentState.handleUserToNotifyDeleted(user);
        if (nextState) {
            this.setState(nextState);
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
                } catch (e) {
                    console.error("Error while finalizing state:", e);
                    Sentry.captureException(e);
                }
            }
            this._finalizeStateTimeout = undefined;
            this._toFinalizeState = undefined;
        }, 5000);
    }

    private getInitialState(): ICommunicationState {
        const propertiesToSync = this.space.getPropertiesToSync();
        const state = this.hasMediaProperties(propertiesToSync)
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
    public handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string
    ) {
        this._currentState.handleMeetingConnectionRestartMessage(meetingConnectionRestartMessage, senderUserId);
    }
}

export const CommunicationConfig = {
    MAX_USERS_FOR_WEBRTC,
};
