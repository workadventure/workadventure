import type { AvailabilityStatus } from "@workadventure/messages";
import type { BodyResourceDescriptionInterface } from "../Entity/PlayerTextures";

export interface PlayerInterface {
    userId: number;
    userJid: string;
    name: string;
    characterLayers: BodyResourceDescriptionInterface[];
    visitCardUrl: string | null;
    companion: string | null;
    userUuid: string;
    availabilityStatus: AvailabilityStatus;
    color?: string | null;
    outlineColor?: number;
    isLogged?: boolean;
}
