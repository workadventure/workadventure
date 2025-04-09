import { z } from "zod";

export const isAddActionBarButtonEvent = z.object({
    id: z.string(),
    label: z.string().optional(),
    toolTip: z.string().optional(),
    bgColor: z.string().optional(),
    textColor: z.string().optional(),
    imageSrc: z.string().optional(),
    isGradient: z.boolean().optional().default(false),
});

export const isAddClassicButtonActionBarEvent = z.object({
    id: z.string(),
    label: z.string(),
    bgColor: z.string().optional(),
    textColor: z.string().optional(),
});

export const isAddActionButtonActionBarEvent = z.object({
    id: z.string(),
    type: z.enum(["action"]),
    imageSrc: z.string(),
    toolTip: z.string(),
});

export type AddButtonActionBarEvent = z.infer<typeof isAddActionBarButtonEvent>;
export type AddActionButtonActionBarEvent = z.infer<typeof isAddActionButtonActionBarEvent>;
export type AddClassicButtonActionBarEvent = z.infer<typeof isAddClassicButtonActionBarEvent>;
export type AddActionsButtonActionBarEventCallback = (event: AddButtonActionBarEvent) => void;

export const isRemoveButtonActionBarEvent = z.object({
    id: z.string(),
});
export type RemoveButtonActionBarEvent = z.infer<typeof isRemoveButtonActionBarEvent>;
