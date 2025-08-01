import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationState {
    handleUserAdded(user: SpaceUser): void;
    handleUserDeleted(user: SpaceUser): void;
    handleUserUpdated(user: SpaceUser): void;
    handleUserReadyForSwitch(userId: string): void;
    handleUserToNotifyAdded(user: SpaceUser): void;
    handleUserToNotifyDeleted(user: SpaceUser): void;
}
