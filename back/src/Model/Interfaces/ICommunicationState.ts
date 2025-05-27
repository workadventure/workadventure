import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationState {
    handleUserAdded(user: SpaceUser): void;
    handleUserDeleted(user: SpaceUser): void;
    handleUserUpdated(user: SpaceUser): void;
    handleUserReadyForSwitch(userId: string): void;
}

export interface IRecordableState extends ICommunicationState {
    handleStartRecording(): Promise<void>;
    handleStopRecording(): Promise<void>;
}
