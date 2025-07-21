export type WokaBodyPart = "body" | "eyes" | "hair" | "clothes" | "hat" | "accessory";

export interface WokaTexture {
    id: string;
    name: string;
    url: string;
    position: number;
}

export interface WokaCollection {
    name: string;
    position: number;
    textures: WokaTexture[];
}

export interface WokaLayer {
    collections: WokaCollection[];
}

export interface WokaData {
    body: WokaLayer;
    eyes: WokaLayer;
    hair: WokaLayer;
    clothes: WokaLayer;
    hat: WokaLayer;
    accessory: WokaLayer;
    woka: WokaLayer;
    [key: string]: WokaLayer;
}
