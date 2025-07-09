import * as Sentry from "@sentry/node";
import { SpaceUser } from "@workadventure/messages";
import { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { WebRTCState } from "./States/WebRTCState";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import { ICommunicationState, IRecordableState } from "./Interfaces/ICommunicationState";
import { DefaultState } from "./States/DefaultState";
import { LivekitState } from "./States/LivekitState";

export interface IRecordingManager {
    startRecording(user: SpaceUser): Promise<void>;
    stopRecording(user: SpaceUser): Promise<void>;
    handleAddUser(user: SpaceUser): void;
    handleRemoveUser(user: SpaceUser): void;
    isRecording: boolean;
    destroy(): void;
}

export class RecordingManager implements IRecordingManager {
    private _isRecording: boolean = false;
    private _user: SpaceUser | undefined;

    constructor(private readonly communicationManager: ICommunicationManager, private readonly space: ICommunicationSpace) {}

    public async startRecording(user: SpaceUser): Promise<void> {
        if (this._isRecording) {
            throw new Error("Recording already started");
        }
        this._isRecording = true;
        const currentState = this.communicationManager.currentState;

        if (this.isRecordableState(currentState)) {
            await currentState.handleStartRecording();
        } else {
            const livekitState = new LivekitState(this.space, this.communicationManager);
            this.communicationManager.setState(livekitState);
            await livekitState.handleStartRecording();
        }

        this._isRecording = true;
    }

    public async stopRecording(user: SpaceUser): Promise<void> {
        if (!this._isRecording) {
            throw new Error("No recording to stop");
        }

        //TODO : verifier que ce soit le bon user qui stop

        if(this._user !== user){
            throw new Error("User is not the one recording");
        }

        this._isRecording = false;
        const currentState = this.communicationManager.currentState;
        
        if (this.isRecordableState(currentState)) {
            await currentState.handleStopRecording();
            this._isRecording = false;
        }
    }

    public handleAddUser(user: SpaceUser): void {
        if(!this._isRecording) {
            return;
        }

        //TODO : send event to the space to notify that a user has been added to the recording
        //this.space.dispatchPrivateEvent(
//
  //      )
    }

    public handleRemoveUser(user: SpaceUser): void {
        if (!this._isRecording) {
            return;
        }

        if (this._user === user) {
            //TODO : stop recording if the user is the one recording
        }
    }

    public get isRecording(): boolean {
        return this._isRecording;
    }

    public destroy(): void {
        if(this._isRecording && this._user) {
            this.stopRecording(this._user).catch((error) => {
                console.error(error);
                Sentry.captureException(error);
            });
        }
    }

    //TODO : voir si on a un autre moyen de faire ça 
    private isRecordableState(state: ICommunicationState): state is IRecordableState {
        return 'handleStartRecording' in state && 'handleStopRecording' in state;
    }
}

export class CommunicationManager implements ICommunicationManager {
    private _currentState: ICommunicationState;
    private _recordingManager: IRecordingManager;

    constructor(private readonly space: ICommunicationSpace) {
        this._currentState = this.getInitialState();
        this._recordingManager = new RecordingManager(this, this.space);
    }

    public handleUserAdded(user: SpaceUser): void {
        //TODO : race condition possible ??
        this._currentState.handleUserAdded(user);
        this._recordingManager.handleAddUser(user);
    }

    public handleUserDeleted(user: SpaceUser): void {
        this._currentState.handleUserDeleted(user);
        this._recordingManager.handleRemoveUser(user);
    }

    public handleUserUpdated(user: SpaceUser): void {
        //TODO : voir si le user perd le tag qui permet de record ???
        this._currentState.handleUserUpdated(user);
    }

    public handleUserReadyForSwitch(userId: string): void {
        this._currentState.handleUserReadyForSwitch(userId);
    }

    public handleStartRecording(user: SpaceUser): void {
        this._recordingManager.startRecording(user).catch((error) => {
            console.error(error);
            Sentry.captureException(error);
        });
    }

    public  handleStopRecording(user: SpaceUser): void {
        this._recordingManager.stopRecording(user).catch((error) => {
            console.error(error);
            Sentry.captureException(error);
        });
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
