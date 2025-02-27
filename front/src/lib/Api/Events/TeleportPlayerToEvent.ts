import { z } from "zod";

export const isTeleportPlayerToEventConfig = z.object({
    x: z.number(),
    y: z.number(),
});

export type TeleportPlayerToEvent = z.infer<typeof isTeleportPlayerToEventConfig>;
