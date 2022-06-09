import { z } from "zod";

export const isSetVariableEvent = z.object({
    key: z.string(),
    value: z.unknown(),
    target: z.enum(["global", "player","sharedPlayer"]),
});

export const isSetVariableIframeEvent = z.object({
    type: z.enum(["setVariable"]),
    data: isSetVariableEvent,
});

/**
 * A message sent from the iFrame to the game to change the value of the property of the layer
 */
export type SetVariableEvent = z.infer<typeof isSetVariableEvent>;
