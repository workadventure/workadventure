import { AvailabilityStatus } from "../Messages/ts-proto-generated/protos/messages";

export interface BodyResourceDescriptionInterface {
    id: string;
    img: string;
    level?: number;
}

export interface PlayerInterface {
    userId: number;
    name: string;
    characterLayers: BodyResourceDescriptionInterface[];
    visitCardUrl: string | null;
    companion: string | null;
    userUuid: string;
    availabilityStatus: AvailabilityStatus;
    color?: string | null;
    outlineColor?: number;
    wokaSrc?: string;
}
