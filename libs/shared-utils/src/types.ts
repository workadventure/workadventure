import { z } from "zod";

export const isKlaxoonEvent = z.object({
    access_code: z.string().optional(),
    url: z.string(),
    author: z
        .object({
            firstname: z.string(),
            lastname: z.string(),
        })
        .optional(),
    imageUrl: z.string().optional(),
    lang: z.string().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
});

export type KlaxoonEvent = z.infer<typeof isKlaxoonEvent>;

export const KLAXOON_ACTIVITY_PICKER_EVENT = "activity-picker-result";
