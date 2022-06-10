import { z } from "zod";
import {isPlayerPosition} from "./PlayerPosition";

export const isAddPlayerEvent = z.object({
    userId: z.number(),
    name: z.string(),
    userUuid: z.string(),
    availabilityStatus: z.string(),
    outlineColor: z.number().optional(),
    position: isPlayerPosition
});

/**
 * A message sent from the game to the iFrame to notify a movement from the camera.
 */
export type AddPlayerEvent = z.infer<typeof isAddPlayerEvent>;
