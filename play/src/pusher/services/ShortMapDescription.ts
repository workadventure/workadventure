import { WAMMetadata } from "@workadventure/map-editor";
import { z } from "zod";

const ShortMapDescription = z
    .object({
        name: z.string(),
        roomUrl: z.string(),
        wamUrl: z.string().optional(),
    })
    .merge(WAMMetadata);

export const ShortMapDescriptionList = z.array(ShortMapDescription);

export type ShortMapDescription = z.infer<typeof ShortMapDescription>;
export type ShortMapDescriptionList = z.infer<typeof ShortMapDescriptionList>;
