import { z } from "zod";

export const isLoadTilesetEvent = z.object({
    url: z.string(),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type LoadTilesetEvent = z.infer<typeof isLoadTilesetEvent>;
