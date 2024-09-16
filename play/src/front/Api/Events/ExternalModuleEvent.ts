import { z } from "zod";

export const isExternalModuleEvent = z.object({
    id: z.string(),
    data: z.unknown(),
});

/**
 * A message sent from the game to the iFrame when the gameState is received by the script
 */
export type ExternalModuleEvent = z.infer<typeof isExternalModuleEvent>;
