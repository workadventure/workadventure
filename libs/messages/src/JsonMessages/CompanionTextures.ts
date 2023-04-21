import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

//The list of all the companion textures

export const isCompanionDetail = z.object({
    id: extendApi(z.string(), {
        description: "The unique identifier of the Woka.",
        example: "03395306-5dee-4b16-a034-36f2c5f2324a",
    }),
    name: extendApi(z.string(), { description: "The name of the texture.", example: "dog1" }),
    url: extendApi(z.string(), {
        description: "The URL of the image of the texture.",
        example: "https://example.com/resources/characters/pipoya/Cat 01-1.png",
    }),
});

export type CompanionTexture = z.infer<typeof isCompanionDetail>;

export const companionList = z.array(isCompanionDetail);

export type CompanionList = z.infer<typeof companionList>;



export const companionTextureCollection = z.object({
    name: extendApi(z.string(), { description: "Collection name", example: "cats" }),
    textures: companionList,
});

export type CompanionCollection = z.infer<typeof companionTextureCollection>;
export const companionCollectionList = z.record(z.object({collections: z.array(companionTextureCollection)}));
export type CompanionCollectionList = z.infer<typeof companionCollectionList>;
