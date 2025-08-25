import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const LivekitCredentialsResponse = z.object({
    livekitHost: extendApi(z.string(), {
        description: "The url to be used in admin",
    }),
    livekitApiKey: extendApi(z.string(), {
        description: "The Api key to be used in admin",
    }),
    livekitApiSecret: extendApi(z.string(), {
        description: "The Api secret to be used in admin",
    }),
});

export type LivekitCredentialsResponse = z.infer<typeof LivekitCredentialsResponse>;
