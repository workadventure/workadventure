import { z } from "zod";

export const isMapDataEvent = z.object({
    data: z.unknown(), // Todo : Typing
});

/**
 * A message sent from the game to the iFrame when the data of the layers change after the iFrame send a message to the game that it want to listen to the data of the layers
 */
export type MapDataEvent = z.infer<typeof isMapDataEvent>;
