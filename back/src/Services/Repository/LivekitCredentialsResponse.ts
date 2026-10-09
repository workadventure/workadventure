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
    autoRecording: extendApi(z.boolean().optional(), {
        description:
            "Whether the world's spaces are recorded automatically: they all use LiveKit, and every microphone of a bubble or meeting area is recorded to its own file. Defaults to false.",
    }),
});

export type LivekitCredentialsResponse = z.infer<typeof LivekitCredentialsResponse>;
