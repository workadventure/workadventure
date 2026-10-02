import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

//The list of all the companion textures

export const CompanionBehavior = z.union([
  z.literal("cat"),
  z.literal("dog"),
  z.literal("red_panda"),
]);

export type CompanionBehavior = z.infer<typeof CompanionBehavior>;

export const CompanionTexture = z.object({
  id: extendApi(z.string(), {
    description: "The unique identifier of the texture.",
    example: "03395306-5dee-4b16-a034-36f2c5f2324a",
  }),
  name: extendApi(z.string(), {
    description: "The name of the texture.",
    example: "dog1",
  }),
  url: extendApi(z.string(), {
    description: "The URL of the image of the texture.",
    example: "https://example.com/resources/characters/pipoya/Cat 01-1.png",
  }),
  behavior: extendApi(CompanionBehavior, {
    description: "The behavior of the companion.",
    example: "cat",
  }).optional(),
});

export type CompanionTexture = z.infer<typeof CompanionTexture>;

export const CompanionTextureCollection = z.object({
  name: extendApi(z.string(), {
    description: "Collection name",
    example: "cats",
  }),
  textures: CompanionTexture.array(),
});
export type CompanionTextureCollection = z.infer<
  typeof CompanionTextureCollection
>;

export const CompanionDetail = z.object({
  id: extendApi(z.string(), {
    description: "The unique identifier of the companion texture.",
    example: "03395306-5dee-4b16-a034-36f2c5f2324a",
  }),
  url: extendApi(z.string(), {
    description: "The URL of the image of the companion.",
    example: "http://example.com/resources/companion/pipoya/cat.png",
  }),
});

export type CompanionDetail = z.infer<typeof CompanionDetail>;
