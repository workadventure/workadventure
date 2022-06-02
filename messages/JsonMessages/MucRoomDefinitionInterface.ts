import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isMucRoomDefinition = z.object({
    name: extendApi(z.optional(z.string()), {
        description: "The name of the MUC room",
        example: "Default room",
    }),
    type: extendApi(z.optional(z.string()), {
        description: "The type of the MUC room",
        example: "default",
    }),
    uri: extendApi(z.optional(z.string()), {
        description: "The uri of the MUC room",
        example: "http://example.com/@/teamSLug/worldSlug",
    }),
});
export type MucRoomDefinitionInterface = z.infer<typeof isMucRoomDefinition>;
