import { z } from "zod";

export const isRemoveActionsMenuKeyFromRemotePlayerEvent = z.object({
    id: z.number(),
    actionKey: z.string(),
});

export type RemoveActionsMenuKeyFromRemotePlayerEvent = z.infer<typeof isRemoveActionsMenuKeyFromRemotePlayerEvent>;

export type RemoveActionsMenuKeyFromRemotePlayerEventCallback = (
    event: RemoveActionsMenuKeyFromRemotePlayerEvent
) => void;
