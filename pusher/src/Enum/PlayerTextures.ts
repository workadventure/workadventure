import * as tg from "generic-type-guard";
import { z } from "zod";

//The list of all the player textures, both the default models and the partial textures used for customization

const wokaTexture = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    tags: z.array(z.string()).optional(),
    tintable: z.boolean().optional(),
});

export type WokaTexture = z.infer<typeof wokaTexture>;

const wokaTextureCollection = z.object({
    name: z.string(),
    textures: z.array(wokaTexture),
});

export type WokaTextureCollection = z.infer<typeof wokaTextureCollection>;

const wokaPartType = z.object({
    collections: z.array(wokaTextureCollection),
    required: z.boolean().optional(),
});

export type WokaPartType = z.infer<typeof wokaPartType>;

export const wokaList = z.record(wokaPartType);

export type WokaList = z.infer<typeof wokaList>;

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
