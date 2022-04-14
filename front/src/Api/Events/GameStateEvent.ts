import { z } from "zod";

export const isGameStateEvent = z.object({
    roomId: z.string(),
    mapUrl: z.string(),
    nickname: z.string(),
    language: z.optional(z.string()),
    uuid: z.optional(z.string()),
    startLayerName: z.optional(z.string()),
    tags: z.array(z.string()),
    variables: z.unknown(), // Todo : Typing
    playerVariables: z.unknown(), // Todo : Typing
    userRoomToken: z.optional(z.string()),
});

/**
 * A message sent from the game to the iFrame when the gameState is received by the script
 */
export type GameStateEvent = z.infer<typeof isGameStateEvent>;
