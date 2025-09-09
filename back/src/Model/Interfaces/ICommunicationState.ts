import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationState {
    handleUserAdded(user: SpaceUser): Promise<void>;
    handleUserDeleted(user: SpaceUser): Promise<void>;
    handleUserUpdated(user: SpaceUser): Promise<void>;
    handleUserReadyForSwitch(userId: string): Promise<void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void>;
}
