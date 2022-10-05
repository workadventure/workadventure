import { z } from "zod";

export const isButtonClickedEvent = z.object({
    popupId: z.number(),
    buttonId: z.number(),
});

/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone marked with the "zone" property.
 */
export type ButtonClickedEvent = z.infer<typeof isButtonClickedEvent>;
