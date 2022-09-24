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
        example: "http://example.com/resources/characters/pipoya/Cat 01-1.png",
    }),
    behaviour: extendApi(z.string(), { description: "The companion behavior (dog|cat)", example: "dog" }),
});

export type CompanionTexture = z.infer<typeof companionTexture>;

export const companionList = z.array(companionTexture);

export type CompanionList = z.infer<typeof companionList>;
