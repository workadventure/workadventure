import { z } from "zod";

export const isShowBusinessCardEvent = z.object({
    visitCardUrl: z.string(),
});

/**
 * A message sent from the iFrame to the game to emit a notification.
 */
export type ShowBusinessCardEvent = z.infer<typeof isShowBusinessCardEvent>;
