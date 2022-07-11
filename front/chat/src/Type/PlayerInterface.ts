import { AvailabilityStatus } from "../Messages/ts-proto-generated/protos/messages";
import type { BodyResourceDescriptionInterface } from "./PlayerTextures";

export interface PlayerInterface {
    userId: number;
    name: string;
    characterLayers: BodyResourceDescriptionInterface[];
    visitCardUrl: string | null;
    companion: string | null;
    userUuid: string;
    availabilityStatus: AvailabilityStatus;
    color?: string;
    outlineColor?: number;
    woka?: string;
}
