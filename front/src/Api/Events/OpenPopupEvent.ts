import { z } from "zod";

export const isButtonDescriptor = z.object({
    label: z.string(),
    className: z.optional(z.string()),
});

export const isOpenPopupEvent = z.object({
    popupId: z.number(),
    targetObject: z.string(),
    message: z.string(),
    buttons: z.array(isButtonDescriptor),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type OpenPopupEvent = z.infer<typeof isOpenPopupEvent>;
