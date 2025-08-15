import { SpaceUser } from "@workadventure/messages";
import { ICommunicationState } from "./ICommunicationState";

export interface ICommunicationManager {
    handleUserAdded(user: SpaceUser): void;
    handleUserDeleted(user: SpaceUser): void;
    handleUserUpdated(user: SpaceUser): void;
    handleUserReadyForSwitch(userId: string): void;
    handleUserToNotifyAdded(user: SpaceUser): void;
    handleUserToNotifyDeleted(user: SpaceUser): void;
    setState(state: ICommunicationState): void;
}
