import { SpaceUser } from "@workadventure/messages";
import { ICommunicationState } from "./ICommunicationState";

export interface ICommunicationManager {
    handleUserAdded(user: SpaceUser): void;
    handleUserDeleted(user: SpaceUser): void;
    handleUserUpdated(user: SpaceUser): void;
    handleUserReadyForSwitch(userId: string): void;
    handleStartRecording(user: SpaceUser, userUuid: string): Promise<void>;
    handleStopRecording(user: SpaceUser): void;
    handleUserToNotifyAdded(user: SpaceUser): void;
    handleUserToNotifyDeleted(user: SpaceUser): void;
    setState(state: ICommunicationState): void;
    currentState: ICommunicationState;
    destroy(): void;
}
