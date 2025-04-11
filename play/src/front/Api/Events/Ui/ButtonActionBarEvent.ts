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

export type AddButtonActionBarEvent = z.infer<typeof isAddActionBarButtonEvent>;
// Aliasing Button types for backward compatibility
export type AddActionButtonActionBarEvent = AddButtonActionBarEvent;
export type AddClassicButtonActionBarEvent = AddButtonActionBarEvent;
export type AddActionsButtonActionBarEventCallback = (event: AddButtonActionBarEvent) => void;

export const isRemoveButtonActionBarEvent = z.object({
    id: z.string(),
});
export type RemoveButtonActionBarEvent = z.infer<typeof isRemoveButtonActionBarEvent>;
