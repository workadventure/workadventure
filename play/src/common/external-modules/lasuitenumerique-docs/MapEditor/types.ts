import { ExtensionModuleAreaProperty } from "@workadventure/map-editor";
import { z } from "zod";
export const LaSuiteNumeriqueDocsPropertyData = ExtensionModuleAreaProperty.extend({
    type: z.literal("extensionModule"),
    subtype: z.literal("laSuiteNumeriqueDocs"),
    data: z
        .object({
            width: z.number().default(50),
            //shouldOpenAutomatically: z.boolean().default(false),
        })
        .optional(),
    serverData: z
        .object({
            laSuiteNumeriqueDocsId: z.string().optional(),
            url: z.string().optional(),
        })
        .optional(),
});
export type LaSuiteNumeriqueDocsPropertyData = z.infer<typeof LaSuiteNumeriqueDocsPropertyData>;
