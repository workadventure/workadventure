import { SpaceUser } from "@workadventure/messages";

export interface SpaceInterface {
    getName(): string;
    setMetadata(metadata: string): void;
    getMetadata(): string;
    addUser(user: SpaceUser): void;
    getUsers(): SpaceUser[];
    getUser(id: number): SpaceUser;
    removeUser(user: SpaceUser): void;
    updateUserData(user: Required<Partial<SpaceUser>, "id">): void;
}
