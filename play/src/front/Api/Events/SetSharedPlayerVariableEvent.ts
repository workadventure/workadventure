import { z } from "zod";

export const isSetSharedPlayerVariableEvent = z.object({
    key: z.string(),
    value: z.unknown(),
    playerId: z.number(),
});

/**
 * A message sent from the game to the iframe to change the value of a player variable
 */
export type SetSharedPlayerVariableEvent = z.infer<typeof isSetSharedPlayerVariableEvent>;
