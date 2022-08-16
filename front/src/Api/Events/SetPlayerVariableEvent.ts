import { z } from "zod";

export const isSetPlayerVariableEvent = z.object({
    key: z.string(),
    value: z.unknown(),
    public: z.boolean(),
    persist: z.boolean(),
    ttl: z.number().optional(),
    scope: z.union([z.literal("room"), z.literal("world")]),
});

/**
 * A message sent from the iFrame to the game to set a variable related to the player
 */
export type SetPlayerVariableEvent = z.infer<typeof isSetPlayerVariableEvent>;
