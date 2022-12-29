import { z } from "zod";

export const isAddButtonActionBarEvent = z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(["button", "action"]).optional().default("button"),
    imageSrc: z.string().optional().nullable(),
    toolTip: z.string().optional().nullable(),
});
export type AddButtonActionBarEvent = z.infer<typeof isAddButtonActionBarEvent>;
export type AddActionsButtonActionBarEventCallback = (event: AddButtonActionBarEvent) => void;

export const isRemoveButtonActionBarEvent = z.object({
    id: z.string(),
});
export type RemoveButtonActionBarEvent = z.infer<typeof isRemoveButtonActionBarEvent>;
