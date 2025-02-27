import { z } from "zod";

export const isGameStateEvent = z.object({
    roomId: z.string(),
    hashParameters: z.record(z.string(), z.string()),
    mapUrl: z.string(),
    nickname: z.string(),
    language: z.string().optional(),
    playerId: z.number().optional(),
    uuid: z.string().optional(),
    startLayerName: z.string().optional(),
    tags: z.string().array(),
    variables: z.unknown(), // Todo : Typing
    playerVariables: z.unknown(), // Todo : Typing
    userRoomToken: z.string().optional(),
    metadata: z.unknown().optional(),
    iframeId: z.string().optional(),
    isLogged: z.boolean().optional().default(false),
});

/**
 * A message sent from the game to the iFrame when the gameState is received by the script
 */
export type GameStateEvent = z.infer<typeof isGameStateEvent>;
