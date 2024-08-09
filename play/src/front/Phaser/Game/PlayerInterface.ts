import type { AvailabilityStatus } from "@workadventure/messages";
import { CompanionTextureDescriptionInterface } from "../Companion/CompanionTextures";
import type { WokaTextureDescriptionInterface } from "../Entity/PlayerTextures";

export interface PlayerInterface {
    //jid: any;
    userId: number;
    name: string;
    characterTextures: WokaTextureDescriptionInterface[];
    visitCardUrl: string | null;
    companionTexture?: CompanionTextureDescriptionInterface;
    userUuid: string;
    availabilityStatus: AvailabilityStatus;
    color?: string | null;
    outlineColor?: number;
    isLogged?: boolean;
    chatID?: string;
    //chat interface
    //companion: string | null;
    //wokaSrc?: string;
}
