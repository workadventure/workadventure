import type { AvailabilityStatus } from "@workadventure/messages";
import type { ResourceDescriptionInterface } from "../Entity/PlayerTextures";

export interface PlayerInterface {
    userId: number;
    userJid: string;
    name: string;
    characterTextureIds: ResourceDescriptionInterface[];
    visitCardUrl: string | null;
    companionTextureId: string | null;
    userUuid: string;
    availabilityStatus: AvailabilityStatus;
    color?: string | null;
    outlineColor?: number;
    isLogged?: boolean;
}
