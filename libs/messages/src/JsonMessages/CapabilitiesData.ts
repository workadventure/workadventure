import { z } from "zod";
import {extendApi} from "@anatine/zod-openapi";

export const isCapabilities = z.object({
    "api/companion/list": extendApi(z.optional(z.string()),{
        description: "Means the api implements a companion list",
        example: "v1"
    }),
    "api/woka/list": extendApi(z.optional(z.string()),{
        description: "Means the api implements woka list, This capability will be added regardless",
        example: "v1"
    })
});

export type Capabilities = z.infer<typeof isCapabilities>;
