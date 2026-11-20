import { z } from "zod";

export const isModalEvent = z.object({
    src: z.string(),
    allow: z.string().optional().nullable().default(null),
    title: z.string().optional().default("WorkAdventure modal iframe"),
    position: z.enum(["right", "left", "center"]).optional().default("right"),
    allowApi: z.boolean().optional().default(false),
    allowFullScreen: z.boolean().optional().default(true),
    closable: z.boolean().optional().default(true),
    // The page draws its own card: no frame, no buttons around it, and the iframe covers the whole screen.
    frameless: z.boolean().optional().default(false),
});

/**
 * A message sent from the iFrame to the game to emit a notification.
 */
export type ModalEvent = z.infer<typeof isModalEvent>;
