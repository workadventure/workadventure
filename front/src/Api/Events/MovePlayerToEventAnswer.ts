import { z } from "zod";

export const isMovePlayerToEventAnswer = z.object({
    x: z.number(),
    y: z.number(),
    cancelled: z.boolean(),
});

export type ActionsMenuActionClickedEvent = z.infer<typeof isMovePlayerToEventAnswer>;
