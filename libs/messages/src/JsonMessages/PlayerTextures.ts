import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

//The list of all the player textures, both the default models and the partial textures used for customization

export const wokaTexture = z.object({
  id: extendApi(z.string(), {
    description: "A unique identifier for this texture.",
    example: "03395306-5dee-4b16-a034-36f2c5f2324a",
  }),
  name: extendApi(z.string(), {
    description: "The name of the texture.",
    example: "Hair 1",
  }),
  url: extendApi(z.string(), {
    description: "The URL of the image of the texture.",
    example:
      "http://example.com/resources/customisation/character_hairs/character_hairs1.png",
  }),
  tags: extendApi(z.array(z.string()).optional(), { deprecated: true }),
  tintable: extendApi(z.boolean().optional(), {
    description: "Whether the color is customizable or not. Not used yet.",
    example: true,
  }),
});

export type WokaTexture = z.infer<typeof wokaTexture>;

const wokaTextureCollection = z.object({
  name: extendApi(z.string(), {
    description: "Name of the collection",
    example: "Hair",
  }),
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

export const wokaPartNames = [
  "woka",
  "body",
  "eyes",
  "hair",
  "clothes",
  "hat",
  "accessory",
];

export const WokaDetail = z.object({
  id: extendApi(z.string(), {
    description: "The unique identifier of the Woka texture.",
    example: "03395306-5dee-4b16-a034-36f2c5f2324a",
  }),
  url: extendApi(z.string(), {
    description: "The URL of the image of the woka.",
    example: "http://example.com/resources/characters/pipoya/male.png",
  }),
});

export type WokaDetail = z.infer<typeof WokaDetail>;
