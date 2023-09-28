import { z } from "zod";

export const isBannerEvent = z.object({
    id: z.string(),
    text: z.string(),
    bgColor: z.string().optional(),
    textColor: z.string().optional(),
    closable: z.boolean().default(true).optional(),
    timeToClose: z.number().default(120000).optional(),
    link: z
        .object({
            url: z.string(),
            label: z.string(),
        })
        .optional(),
});

export type BannerEvent = z.infer<typeof isBannerEvent>;
