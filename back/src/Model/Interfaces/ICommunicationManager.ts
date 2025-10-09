import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationManager {
    handleUserAdded(user: SpaceUser): Promise<void>;
    handleUserDeleted(user: SpaceUser, shouldStopRecording: boolean): Promise<Promise<void>>;
    handleUserUpdated(user: SpaceUser): Promise<void>;
    handleStartRecording(user: SpaceUser, userUuid: string): Promise<void>;
    handleStopRecording(user: SpaceUser): Promise<void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void>;
    currentState: ICommunicationState;
    destroy(): void;
}
