import * as Sentry from "@sentry/node";
import { SpaceUser } from "@workadventure/messages";
import { MAX_USERS_FOR_WEBRTC } from "../Enum/EnvironmentVariable";
import { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { WebRTCState } from "./States/WebRTCState";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import { ICommunicationState } from "./Interfaces/ICommunicationState";
import { VoidState } from "./States/VoidState";
import { IRecordingManager, RecordingManager } from "./RecordingManager";

export class CommunicationManager implements ICommunicationManager {
    private _currentState: ICommunicationState;
    private _toFinalizeState: ICommunicationState | undefined;
    private _finalizeStateTimeout: ReturnType<typeof setTimeout> | undefined;
    private _users: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private _usersToNotify: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private _recordingManager: IRecordingManager;

    constructor(private readonly space: ICommunicationSpace) {
        this._currentState = this.getInitialState();
        this._recordingManager = new RecordingManager(this, this.space);
    }

    public async handleUserAdded(user: SpaceUser): Promise<void> {
        //TODO : race condition possible ??
        this._recordingManager.handleAddUser(user);
        this._users.set(user.spaceUserId, user);
        const nextState = await this._currentState.handleUserAdded(user);
        if (nextState) {
            this.setState(nextState);
        }
    }

    public async handleUserDeleted(user: SpaceUser, shouldStopRecording: boolean = true): Promise<Promise<void>> {
        this._users.delete(user.spaceUserId);
        const nextState = await this._currentState.handleUserDeleted(user);
        if (nextState) {
            this.setState(nextState);
        }
        if (shouldStopRecording) {
            await this._recordingManager.handleRemoveUser(user);
        }
    }

    public async handleUserUpdated(user: SpaceUser): Promise<void> {
        const nextState = await this._currentState.handleUserUpdated(user);
        if (nextState) {
            this.setState(nextState);
        }
    }

    public async handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        this._usersToNotify.set(user.spaceUserId, user);
        const nextState = await this._currentState.handleUserToNotifyAdded(user);
        if (nextState) {
            this.setState(nextState);
        }
    }

    public async handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        this._usersToNotify.delete(user.spaceUserId);
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
            ? new WebRTCState(this.space, this._users, this._usersToNotify)
            : new VoidState();
        state.init();
        return state;
    }

    public async handleStartRecording(user: SpaceUser, userUuid: string): Promise<void> {
        await this._recordingManager.startRecording(user, userUuid);
    }

    public async handleStopRecording(user: SpaceUser): Promise<void> {
        await this._recordingManager.stopRecording(user);
        return;
    }

    get currentState(): ICommunicationState {
        return this._currentState;
    }

    private hasMediaProperties(properties: string[]): boolean {
        return properties.some((prop) => ["cameraState", "microphoneState", "screenSharingState"].includes(prop));
    }

    public destroy() {
        this._recordingManager.destroy();
    }

    private finalizeState(toFinalizeState: ICommunicationState) {
        toFinalizeState.finalize();
    }

    get users(): ReadonlyMap<string, SpaceUser> {
        return this._users;
    }

    get usersToNotify(): ReadonlyMap<string, SpaceUser> {
        return this._usersToNotify;
    }
}

export const CommunicationConfig = {
    MAX_USERS_FOR_WEBRTC,
};
