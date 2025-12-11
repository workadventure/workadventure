import type { SpaceUser } from "@workadventure/messages";

export interface ICommunicationManager {
    handleUserAdded(user: SpaceUser): Promise<void>;
    handleUserDeleted(user: SpaceUser): Promise<void>;
    handleUserUpdated(user: SpaceUser): Promise<void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void>;
}
