import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationState {
    get communicationType(): string;
    init(): void;
    handleUserAdded(user: SpaceUser): Promise<ICommunicationState | void>;
    handleUserDeleted(user: SpaceUser): Promise<ICommunicationState | void>;
    handleUserUpdated(user: SpaceUser): Promise<ICommunicationState | void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<ICommunicationState | void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<ICommunicationState | void>;
    switchState(targetCommunicationType: string): void;
    finalize(): void;
}

export interface IRecordableState extends ICommunicationState {
    handleStartRecording(user: SpaceUser): Promise<void>;
    handleStopRecording(): Promise<void>;
}
