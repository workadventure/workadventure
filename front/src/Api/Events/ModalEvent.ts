import { z } from "zod";

export const isModalEvent = z.object({
    src: z.string(),
    allow: z.string().nullable().default("fullscreen; clipboard-read; clipboard-write"),
    tiltle: z.string().nullable().default("WorkAdventure modal iframe"),
});

/**
 * A message sent from the iFrame to the game to emit a notification.
 */
export type ModalEvent = z.infer<typeof isModalEvent>;
