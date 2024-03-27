import { z } from "zod";

export const isPlayer = z.object({
    userId: z.optional(z.number()),
    name: z.optional(z.string()),
    characterTextures: z.object({
        id: z.optional(z.string()),
        img: z.optional(z.string()),
        level: z.optional(z.number()),
    }),
    visitCardUrl: z.optional(z.string()),
    companion: z.optional(z.string()),
    userUuid: z.optional(z.number()),
    availabilityStatus: z.optional(z.string()),
    color: z.optional(z.string()),
    outlineColor: z.optional(z.string()),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type Player = z.infer<typeof isPlayer>;
