import { isMetaTagFavicon } from "src/messages/JsonMessages/MetaTagFavicon";
import { z } from "zod";

export const isMetaTagsValues = z.object({
    title: z.string(),
    description: z.string(),
    favicons: isMetaTagFavicon.array(),
    appName: z.string(),
    shortAppName: z.string(),
    themeColor: z.string(),
    cardImage: z.string(),
});

export type MetaTagsValues = z.infer<typeof isMetaTagsValues>;
