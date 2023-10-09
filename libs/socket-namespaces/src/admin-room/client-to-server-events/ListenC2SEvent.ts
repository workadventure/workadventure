import { z } from "zod";

export const ListenC2SEvent = z.object({
    roomIds: z.array(z.string()),
});

export type ListenC2SEvent = z.infer<typeof ListenC2SEvent>;
