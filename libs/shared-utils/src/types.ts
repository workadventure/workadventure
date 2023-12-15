import { z } from "zod";

export const isKlaxoonEvent = z.object({
    access_code: z.string().optional().nullable(),
    url: z.string(),
    author: z
        .object({
            firstname: z.string().nullable(),
            lastname: z.string().nullable(),
        })
        .optional()
        .nullable(),
    imageUrl: z.string().optional().nullable(),
    lang: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
});

export type KlaxoonEvent = z.infer<typeof isKlaxoonEvent>;

export const KLAXOON_ACTIVITY_PICKER_EVENT = "activity-picker-result";
