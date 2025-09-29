import { PublicEvent, PrivateEvent, SpaceUser } from "@workadventure/messages";

export interface ICommunicationSpace {
    getAllUsers(): SpaceUser[];
    getUsersInFilter(): SpaceUser[];
    getUsersToNotify(): SpaceUser[];
    //getUser(userId: string): SpaceUser | undefined;
    dispatchPrivateEvent(privateEvent: PrivateEvent): void;
    dispatchPublicEvent(publicEvent: PublicEvent): void;
    getSpaceName(): string;
    getPropertiesToSync(): string[];
}
