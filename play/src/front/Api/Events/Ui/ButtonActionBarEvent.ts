import { z } from "zod";

export const isAddClassicButtonActionBarEvent = z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(["button"]).optional().default("button"),
});

export const isAddActionButtonActionBarEvent = z.object({
    id: z.string(),
    type: z.enum(["action"]),
    imageSrc: z.string(),
    toolTip: z.string(),
});

export const isAddButtonActionBarEvent = z.union([isAddClassicButtonActionBarEvent, isAddActionButtonActionBarEvent]);
export type AddButtonActionBarEvent = z.infer<typeof isAddButtonActionBarEvent>;
export type AddActionButtonActionBarEvent = z.infer<typeof isAddActionButtonActionBarEvent>;
export type AddClassicButtonActionBarEvent = z.infer<typeof isAddClassicButtonActionBarEvent>;
export type AddActionsButtonActionBarEventCallback = (event: AddButtonActionBarEvent) => void;

export const isRemoveButtonActionBarEvent = z.object({
    id: z.string(),
});
export type RemoveButtonActionBarEvent = z.infer<typeof isRemoveButtonActionBarEvent>;
