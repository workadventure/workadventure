import { z } from "zod";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

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

export const isWokaDetail = z.object({
    id: z.string(),
    url: z.optional(z.string()),
    layer: z.optional(z.string()),
});

export type WokaDetail = z.infer<typeof isWokaDetail>;

export type WokaDetailsResult = WokaDetail[];
