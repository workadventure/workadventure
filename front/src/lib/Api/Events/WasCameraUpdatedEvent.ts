import { z } from "zod";

export const isWasCameraUpdatedEvent = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    zoom: z.number(),
});

/**
 * A message sent from the game to the iFrame to notify a movement from the camera.
 */
export type WasCameraUpdatedEvent = z.infer<typeof isWasCameraUpdatedEvent>;

export type WasCameraUpdatedEventCallback = (event: WasCameraUpdatedEvent) => void;
