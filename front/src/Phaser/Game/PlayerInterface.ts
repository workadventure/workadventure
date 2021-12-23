import type { BodyResourceDescriptionInterface } from "../Entity/PlayerTextures";

export interface PlayerInterface {
    userId: number;
    name: string;
    characterLayers: BodyResourceDescriptionInterface[];
    visitCardUrl: string | null;
    companion: string | null;
    userUuid: string;
    color?: string;
    outlineColor?: number;
}
