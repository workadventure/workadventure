import { z } from "zod";

export const isActionsMenuActionClickedEvent = z.object({
    id: z.number(),
    actionName: z.string(),
});

export type ActionsMenuActionClickedEvent = z.infer<typeof isActionsMenuActionClickedEvent>;

export type ActionsMenuActionClickedEventCallback = (event: ActionsMenuActionClickedEvent) => void;
