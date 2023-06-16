import { AvailabilityStatus } from "@workadventure/messages";

export interface WokaTextureDescriptionInterface {
    id: string;
    url: string;
}

export interface PlayerInterface {
    userId: number;
    name: string;
    characterLayers: WokaTextureDescriptionInterface[];
    visitCardUrl: string | null;
    companion: string | null;
    userUuid: string;
    availabilityStatus: AvailabilityStatus;
    color?: string | null;
    outlineColor?: number;
    wokaSrc?: string;
}
