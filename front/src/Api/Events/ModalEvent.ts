import { z } from "zod";

export const isModalEvent = z.object({
    src: z.string(),
    allow: z.string().optional().default("fullscreen; clipboard-read; clipboard-write"),
    tiltle: z.string().optional().default("WorkAdventure modal iframe"),
    position: z.string().optional().default("right"),
});

/**
 * A message sent from the iFrame to the game to emit a notification.
 */
export type ModalEvent = z.infer<typeof isModalEvent>;
