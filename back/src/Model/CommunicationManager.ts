import { SpaceUser } from "@workadventure/messages";
import { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { WebRTCState } from "./States/WebRTCState";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import { ICommunicationState } from "./Interfaces/ICommunicationState";
import { DefaultState } from "./States/DefaultState";
import { IRecordingManager, RecordingManager } from "./RecordingManager";

export class CommunicationManager implements ICommunicationManager {
    private _currentState: ICommunicationState;
    private _recordingManager: IRecordingManager;

    constructor(private readonly space: ICommunicationSpace) {
        this._currentState = this.getInitialState();
        this._recordingManager = new RecordingManager(this, this.space);
    }

    public handleUserAdded(user: SpaceUser): void {
        //TODO : race condition possible ??
        this._recordingManager.handleAddUser(user);
        this._currentState.handleUserAdded(user);
    }

    public async handleUserDeleted(user: SpaceUser, shouldStopRecording: boolean = true): Promise<void> {
        this._currentState.handleUserDeleted(user);
        if (shouldStopRecording) {
            await this._recordingManager.handleRemoveUser(user);
        }
    }

    public handleUserUpdated(user: SpaceUser): void {
        //TODO : voir si le user perd le tag qui permet de record ???
        this._currentState.handleUserUpdated(user);
    }

    public handleUserReadyForSwitch(userId: string): void {
        this._currentState.handleUserReadyForSwitch(userId);
    }

    public async handleUserToNotifyAdded(user: SpaceUser): void {
        await this._currentState.handleUserToNotifyAdded(user);
    }

    public handleUserToNotifyDeleted(user: SpaceUser): void {
        this._currentState.handleUserToNotifyDeleted(user);
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

    public setState(state: ICommunicationState): void {
        this._currentState = state;
    }

    private getInitialState(): ICommunicationState {
        const propertiesToSync = this.space.getPropertiesToSync();
        return this.hasMediaProperties(propertiesToSync) ? new WebRTCState(this.space, this) : new DefaultState();
    }

    private hasMediaProperties(properties: string[]): boolean {
        return properties.some((prop) => ["cameraState", "microphoneState", "screenSharingState"].includes(prop));
    }

    public destroy() {
        this._recordingManager.destroy();
    }
}

export const CommunicationConfig = {
    //TODO : switch back to 4
    MAX_USERS_FOR_WEBRTC: 4,
};
