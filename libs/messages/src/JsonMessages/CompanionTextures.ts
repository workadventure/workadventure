import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

//The list of all the companion textures

export const companionTexture = z.object({
    name: extendApi(z.string(), { description: "The name of the texture.", example: "dog1" }),
    img: extendApi(z.string(), {
        description: "The URL of the image of the texture.",
        example: "https://example.com/resources/characters/pipoya/Cat 01-1.png",
    }),
});

export type CompanionTexture = z.infer<typeof companionTexture>;

export const companionList = z.array(companionTexture);

export type CompanionList = z.infer<typeof companionList>;

export const companionTextureCollection = z.object({
    name: extendApi(z.string(), { description: "A collection of companions" }),
    textures: companionList,
});

export type CompanionCollection = z.infer<typeof companionTextureCollection>;
export const companionCollectionList = z.array(companionTextureCollection);
export type CompanionCollectionList = z.infer<typeof companionCollectionList>;
