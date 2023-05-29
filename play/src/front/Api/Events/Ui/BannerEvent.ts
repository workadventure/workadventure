import { z } from "zod";

export const isBannerEvent = z.object({
    id: z.string(),
    text: z.string(),
    bgColor: z.string().optional(),
    textColor: z.string().optional(),
    closable: z.boolean().optional().default(true),
    timeToClose: z.number().optional().default(120000),
    link: z
        .object({
            url: z.string(),
            label: z.string(),
        })
        .optional(),
});

export type BannerEvent = z.infer<typeof isBannerEvent>;
