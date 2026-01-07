import { z } from "zod";

export const ResolutionMessage = z.object({
    type: z.literal("resolution"),
    bitrate: z.number().int().positive(),
    fps: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
});

export type ResolutionMessage = z.infer<typeof ResolutionMessage>;
