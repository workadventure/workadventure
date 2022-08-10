import { z } from "zod";

export const isLocale = z.object({
    locale: z.string(),
});

export type Locale = z.infer<typeof isLocale>;
