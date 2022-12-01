import { z } from "zod";

export const isAddButtonActionBarEvent = z.object({
    id: z.string(),
    label: z.string(),
});
export type AddButtonActionBarEvent = z.infer<typeof isAddButtonActionBarEvent>;
export type AddActionsButtonActionBarEventCallback = (event: AddButtonActionBarEvent) => void;

export const isRemoveButtonActionBarEvent = z.object({
    id: z.string(),
});
export type RemoveButtonActionBarEvent = z.infer<typeof isRemoveButtonActionBarEvent>;
