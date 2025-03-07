import { SpaceUser } from "@workadventure/messages";
import { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { WebRTCState } from "./States/WebRTCState";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import { ICommunicationState } from "./Interfaces/ICommunicationState";

export class CommunicationManager implements ICommunicationManager{

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

    public handleUserReadyForSwitch(userId: number): void {
        this._currentState.handleUserReadyForSwitch(userId);
    }

    private getInitialState(): ICommunicationState {
        const propertiesToSync = this.space.getPropertiesToSync();
        return this.hasMediaProperties(propertiesToSync) 
            ? new WebRTCState(this.space, this) 
            : new DefaultState();
    }

    private hasMediaProperties(properties: string[]): boolean {
        return properties.some(prop => 
            ['cameraState', 'microphoneState', 'screenSharingState'].includes(prop)
        );
    }

     setState(state: ICommunicationState): void {
        this._currentState = state;
    }
}

export class DefaultState implements ICommunicationState {
    handleUserAdded(user: SpaceUser): void {
        console.info("DefaultState handleUserAdded", user);
    }
    handleUserDeleted(user: SpaceUser): void {
        console.info("DefaultState handleUserDeleted", user);
    }
    handleUserUpdated(user: SpaceUser): void {
        console.info("DefaultState handleUserUpdated", user);
    }
    handleUserReadyForSwitch(userId: number): void {
        console.info("DefaultState handleUserReadyForSwitch", userId);
    }
}




