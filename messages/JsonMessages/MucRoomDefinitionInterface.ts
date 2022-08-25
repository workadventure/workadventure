import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isMucRoomDefinition = z.object({
    name: extendApi(z.string(), {
        description: "The name of the MUC room",
        example: "Default room",
    }),
    url: extendApi(z.string(), {
        description: "The url of the MUC room",
        example: "http://example.com/@/teamSLug/worldSlug",
    }),
    type: extendApi(z.string(), {
        description: "The type of the MUC room",
        example: "live",
    }),
    subscribe: extendApi(z.boolean(), {
        description: "If the user need to subscribe and be persisted in the MUC room",
    }),
});
export type MucRoomDefinitionInterface = z.infer<typeof isMucRoomDefinition>;
