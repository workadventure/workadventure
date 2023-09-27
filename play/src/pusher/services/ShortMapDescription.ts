import { z } from "zod";

const ShortMapDescription = z.object({
    roomUrl: z.string(),
    name: z.string(),
    wamUrl: z.string().optional(),
});

export const ShortMapDescriptionList = z.array(ShortMapDescription);

export type ShortMapDescription = z.infer<typeof ShortMapDescription>;
export type ShortMapDescriptionList = z.infer<typeof ShortMapDescriptionList>;
