import { z } from "zod";

export const isSetVariableEvent = z.object({
    key: z.string(),
    value: z.unknown(),
});

export const isSetVariableIframeEvent = z.object({
    type: z.literal("setVariable"),
    data: isSetVariableEvent,
});

/**
 * A message sent from the iFrame to the game to change the value of the property of the layer
 */
export type SetVariableEvent = z.infer<typeof isSetVariableEvent>;
