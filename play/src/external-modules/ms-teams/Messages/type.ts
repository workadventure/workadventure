import { z } from "zod";

export const isExternalMsTeamsModuleEvent = z.object({
    id: z.string(),
    data: z.object({
        name: z.string(),
        message: z.string(),
    }),
});

/**
 * A message sent from the game to the iFrame when the message is received by the script
 */
export type ExternalMsTeamsModuleEvent = z.infer<typeof isExternalMsTeamsModuleEvent>;