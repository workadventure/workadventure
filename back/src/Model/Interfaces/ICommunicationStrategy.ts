import type { SpaceUser } from "@workadventure/messages";

export interface ICommunicationStrategy {
    addUser(user: SpaceUser): Promise<void>;
    deleteUser(user: SpaceUser): void;
    updateUser(user: SpaceUser): void;
    addUserToNotify(user: SpaceUser): Promise<void>;
    deleteUserFromNotify(user: SpaceUser): void;
    initialize(users: ReadonlyMap<string, SpaceUser>, usersToNotify: ReadonlyMap<string, SpaceUser>): void;
    addUserReady(userId: string): void;
    canSwitch(): boolean;
    cleanup(): void;
}
