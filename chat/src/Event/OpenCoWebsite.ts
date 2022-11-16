import { z } from "zod";

export const isOpenCoWebsite = z.object({
    id: z.string(),
});

export type OpenCoWebsite = z.infer<typeof isOpenCoWebsite>;
