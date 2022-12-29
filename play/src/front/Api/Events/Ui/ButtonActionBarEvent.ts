import { z } from "zod";

export const isAddButtonActionBarEvent = z.union([
    z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(["button"]).optional().default("button"),
    }),
    z.object({
        id: z.string(),
        type: z.enum(["action"]),
        imageSrc: z.string(),
        toolTip: z.string(),
    }),
]);
export type AddButtonActionBarEvent = z.infer<typeof isAddButtonActionBarEvent>;
export type AddActionsButtonActionBarEventCallback = (event: AddButtonActionBarEvent) => void;

export const isRemoveButtonActionBarEvent = z.object({
    id: z.string(),
});
export type RemoveButtonActionBarEvent = z.infer<typeof isRemoveButtonActionBarEvent>;
