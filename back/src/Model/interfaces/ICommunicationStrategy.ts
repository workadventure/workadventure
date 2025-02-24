import { SpaceUser } from "@workadventure/messages";

export interface ICommunicationStrategy {
    addUser(user: SpaceUser): void;
    deleteUser(user: SpaceUser): void;
    updateUser(user: SpaceUser): void;
    initialize(): void;
    cleanup(): void;
} 