import { z } from "zod";

export const isAddActionsMenuKeyToRemotePlayerEvent = z.object({
    id: z.number(),
    actionKey: z.string(),
});

export type AddActionsMenuKeyToRemotePlayerEvent = z.infer<typeof isAddActionsMenuKeyToRemotePlayerEvent>;

export type AddActionsMenuKeyToRemotePlayerEventCallback = (event: AddActionsMenuKeyToRemotePlayerEvent) => void;
