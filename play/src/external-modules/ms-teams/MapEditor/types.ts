import { ExtensionModuleAreaProperty } from "@workadventure/map-editor";
import { z } from "zod";

export const TeamsMeetingPropertyData = ExtensionModuleAreaProperty.extend({
    type: z.literal("extensionModule"),
    subtype: z.literal("teams"),
    data: z.string().optional(),
});
export type TeamsMeetingPropertyData = z.infer<typeof TeamsMeetingPropertyData>;
