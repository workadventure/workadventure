import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationStrategy {
    addUser(user: SpaceUser, switchInProgress?: boolean): void;
    deleteUser(user: SpaceUser): void;
    updateUser(user: SpaceUser): void;
    addUserToNotify(user: SpaceUser): void;
    deleteUserFromNotify(user: SpaceUser): void;
    initialize(readyUsers: Set<string>): void;
    addUserReady(userId: string): void;
    canSwitch(): boolean;
    cleanup(): void;
}

export interface IRecordableStrategy extends ICommunicationStrategy {
    startRecording(user: SpaceUser, userUuid: string): Promise<void>;
    stopRecording(): Promise<void>;
}
