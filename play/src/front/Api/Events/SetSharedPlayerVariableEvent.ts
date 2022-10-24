import { z } from "zod";

export const isSetSharedPlayerVariableEvent = z.object({
    key: z.string(),
    value: z.unknown(),
    playerId: z.number(),
});

/**
 * A message sent from the iFrame to the game to change the value of the property of the layer
 */
export type SetSharedPlayerVariableEvent = z.infer<typeof isSetSharedPlayerVariableEvent>;
