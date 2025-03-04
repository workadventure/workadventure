import { PublicEvent, PrivateEvent, SpaceUser } from "@workadventure/messages";

export interface ICommunicationSpaceManager {
    getAllUsers(): SpaceUser[];
    getUser(userId: number): SpaceUser | undefined;
    dispatchPrivateEvent(privateEvent: PrivateEvent): void;
    dispatchPublicEvent(publicEvent: PublicEvent): void;
    getSpaceName(): string;
    getPropertiesToSync(): string[];
} 