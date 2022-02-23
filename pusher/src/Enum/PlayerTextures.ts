import * as tg from "generic-type-guard";

//The list of all the player textures, both the default models and the partial textures used for customization

export const isWokaTexture = new tg.IsInterface()
    .withProperties({
        id: tg.isString,
        name: tg.isString,
        url: tg.isString,
        position: tg.isNumber,
    })
    .withOptionalProperties({
        tags: tg.isArray(tg.isString),
        tintable: tg.isBoolean,
    })
    .get();

export type WokaTexture = tg.GuardedType<typeof isWokaTexture>;

export const isWokaTextureCollection = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
        position: tg.isNumber,
        textures: tg.isArray(isWokaTexture),
    })
    .get();

export type WokaTextureCollection = tg.GuardedType<typeof isWokaTextureCollection>;

export const isWokaPartType = new tg.IsInterface()
    .withProperties({
        collections: tg.isArray(isWokaTextureCollection),
    })
    .withOptionalProperties({
        required: tg.isBoolean,
    })
    .get();

export type WokaPartType = tg.GuardedType<typeof isWokaPartType>;

export const isWokaList = new tg.IsInterface().withStringIndexSignature(isWokaPartType).get();

export type WokaList = tg.GuardedType<typeof isWokaList>;

export const wokaPartNames = ["woka", "body", "eyes", "hair", "clothes", "hat", "accessory"];

export const isWokaDetail = new tg.IsInterface()
    .withProperties({
        id: tg.isString,
    })
    .withOptionalProperties({
        url: tg.isString,
        layer: tg.isString,
    })
    .get();

export type WokaDetail = tg.GuardedType<typeof isWokaDetail>;

export type WokaDetailsResult = WokaDetail[];
