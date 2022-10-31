import { z } from "zod";

export const isViewport = z.object({
    left: z.number(),
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
});

export type ViewportInterface = z.infer<typeof isViewport>;
