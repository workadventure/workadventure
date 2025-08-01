import { SpaceUser } from "@workadventure/messages";
import { ICommunicationState } from "./ICommunicationState";

export interface ICommunicationManager {
    handleUserAdded(user: SpaceUser): void;
    handleUserDeleted(user: SpaceUser, shouldStopRecording: boolean): Promise<void>;
    handleUserUpdated(user: SpaceUser): void;
    handleUserReadyForSwitch(userId: string): void;
    handleStartRecording(user: SpaceUser, userUuid: string): Promise<void>;
    handleStopRecording(user: SpaceUser): Promise<void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<void>;
    handleUserToNotifyDeleted(user: SpaceUser): void;
    setState(state: ICommunicationState): void;
    currentState: ICommunicationState;
    destroy(): void;
}
