import { AvailabilityStatus } from "../../Messages/ts-proto-generated/protos/messages";
import type { BodyResourceDescriptionInterface } from "../Entity/PlayerTextures";
import {z} from "zod";

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
}
