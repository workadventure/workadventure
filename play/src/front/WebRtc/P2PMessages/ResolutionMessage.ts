import { z } from "zod";

/**
 * Size of the tile the viewer displays our video in. A 0x0 size means the viewer does not display it at all
 * (hidden tab, tile scrolled out of view): the sender stops encoding for that viewer until a size comes back.
 */
export const ResolutionMessage = z.object({
    type: z.literal("resolution"),
    width: z.number().int().nonnegative(),
    height: z.number().int().nonnegative(),
    maxBitrate: z.number().int().nonnegative(),
});

export type ResolutionMessage = z.infer<typeof ResolutionMessage>;
