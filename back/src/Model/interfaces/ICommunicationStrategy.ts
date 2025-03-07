import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationStrategy {
    addUser(user: SpaceUser, switchInProgress?: boolean): void;
    deleteUser(user: SpaceUser): void;
    updateUser(user: SpaceUser): void;
    initialize(): void;
    addUserReady(userId: number): void;
    canSwitch(): boolean;
    cleanup(): void;
} 