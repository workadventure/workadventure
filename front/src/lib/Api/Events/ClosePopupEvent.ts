import { z } from "zod";

export const isClosePopupEvent = z.object({
    popupId: z.number(),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type ClosePopupEvent = z.infer<typeof isClosePopupEvent>;
