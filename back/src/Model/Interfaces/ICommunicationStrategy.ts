import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationStrategy {
    addUser(user: SpaceUser, switchInProgress?: boolean): void;
    deleteUser(user: SpaceUser): void;
    updateUser(user: SpaceUser): void;
    initialize(readyUsers: Set<string>): void;
    addUserReady(userId: string): void;
    canSwitch(): boolean;
    cleanup(): void;
}

export interface IRecordableStrategy extends ICommunicationStrategy {
    startRecording(): Promise<void>;
    stopRecording(): Promise<void>;
}
