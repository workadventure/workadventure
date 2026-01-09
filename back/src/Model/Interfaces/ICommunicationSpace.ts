import type { PublicEvent, PrivateEvent, SpaceUser } from "@workadventure/messages";

export interface ICommunicationSpace {
    getAllUsers(): SpaceUser[];
    getUsersInFilter(): SpaceUser[];
    getUsersToNotify(): SpaceUser[];
    dispatchPrivateEvent(privateEvent: PrivateEvent): void;
    dispatchPublicEvent(publicEvent: PublicEvent): Promise<void>;
    getSpaceName(): string;
    getPropertiesToSync(): string[];
    updateMetadata(metadata: { [key: string]: unknown }, senderId: string): Promise<void>;
}
