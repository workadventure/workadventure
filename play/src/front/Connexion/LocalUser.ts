import { MAX_USERNAME_LENGTH } from "../Enum/EnvironmentVariable";
import { localUserStore } from "./LocalUserStore";

export type LayerNames = "woka" | "body" | "eyes" | "hair" | "clothes" | "hat" | "accessory";

export interface CharacterTexture {
    id: string;
    layer: LayerNames;
    url: string;
}

export const maxUserNameLength: number = MAX_USERNAME_LENGTH;

export function isUserNameValid(value: unknown): boolean {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        !localUserStore.isUsernameInJwt() &&
        value.length <= maxUserNameLength &&
        /\S/.test(value)
    );
}

export function isUserNameTooLong(value: unknown): boolean {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        !localUserStore.isUsernameInJwt() &&
        value.length > maxUserNameLength
    );
}

export function areCharacterLayersValid(value: string[] | null): boolean {
    if (!value || !value.length) {
        return false;
    }
    for (const layerName of value) {
        if (layerName.length === 0 || layerName === " ") {
            return false;
        }
    }
    return true;
}

export class LocalUser {
    constructor(public readonly uuid: string, public email: string | null = null) {}
}
