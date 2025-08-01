import { SpaceUser } from "@workadventure/messages";
import { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { WebRTCState } from "./States/WebRTCState";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import { ICommunicationState } from "./Interfaces/ICommunicationState";
import { DefaultState } from "./States/DefaultState";

export class CommunicationManager implements ICommunicationManager {
    private _currentState: ICommunicationState;

    constructor(private readonly space: ICommunicationSpace) {
        this._currentState = this.getInitialState();
    }

    public handleUserAdded(user: SpaceUser): void {
        this._currentState.handleUserAdded(user);
    }

    public handleUserDeleted(user: SpaceUser): void {
        this._currentState.handleUserDeleted(user);
    }

    public handleUserUpdated(user: SpaceUser): void {
        this._currentState.handleUserUpdated(user);
    }

    public handleUserReadyForSwitch(userId: string): void {
        this._currentState.handleUserReadyForSwitch(userId);
    }

    public handleUserToNotifyAdded(user: SpaceUser): void {
        this._currentState.handleUserToNotifyAdded(user);
    }

    public handleUserToNotifyDeleted(user: SpaceUser): void {
        this._currentState.handleUserToNotifyDeleted(user);
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
}

export const CommunicationConfig = {
    MAX_USERS_FOR_WEBRTC: 4,
};
