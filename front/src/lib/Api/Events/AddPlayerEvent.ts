import { z } from "zod";
import { isPlayerPosition } from "./PlayerPosition";

export const isAddPlayerEvent = z.object({
    playerId: z.number(),
    name: z.string(),
    userUuid: z.string(),
    availabilityStatus: z.string(),
    outlineColor: z.number().optional(),
    position: isPlayerPosition,
    variables: z.map(z.string(), z.unknown()),
    chatID: z.string().optional().nullable(),
});

export const isRemotePlayerChangedEvent = isAddPlayerEvent
    .omit({
        userUuid: true,
    })
    .partial({
        name: true,
        availabilityStatus: true,
        outlineColor: true,
        position: true,
        variables: true,
    });

/**
 * A message sent from the game to the iFrame to notify a new player arrived in our viewport
 */
export type AddPlayerEvent = z.infer<typeof isAddPlayerEvent>;
/**
 * A message sent from the game to the iFrame to notify a player has changed (moved / changed name, etc...)
 */
export type RemotePlayerChangedEvent = z.infer<typeof isRemotePlayerChangedEvent>;
