import { z } from "zod";

export const isEnterLeaveEvent = z.object({
    name: z.string(),
});

/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone marked with the "zone" property.
 */
export type EnterLeaveEvent = z.infer<typeof isEnterLeaveEvent>;
