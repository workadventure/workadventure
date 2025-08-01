import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationState {
    handleUserAdded(user: SpaceUser): void;
    handleUserDeleted(user: SpaceUser): void;
    handleUserUpdated(user: SpaceUser): void;
    handleUserReadyForSwitch(userId: string): void;
    handleUserToNotifyAdded(user: SpaceUser): Promise<void>;
    handleUserToNotifyDeleted(user: SpaceUser): void;
}

export interface IRecordableState extends ICommunicationState {
    handleStartRecording(user: SpaceUser, userUuid: string): Promise<void>;
    handleStopRecording(): Promise<void>;
}
