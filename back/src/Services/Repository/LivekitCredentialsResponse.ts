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
            "Whether the world's spaces are recorded automatically: every microphone of a bubble or meeting area is recorded to its own file, by an egress on this LiveKit server. Asked once per space, at its first join; only a back with LIVEKIT_RECORDING_S3_BUCKET set records. Defaults to false.",
    }),
    maxUsersForWebrtc: extendApi(z.number().int().positive().nullable().optional(), {
        description:
            "The world's own MAX_USERS_FOR_WEBRTC: a bubble or meeting area of more users goes from P2P to LiveKit (1 puts every conversation on LiveKit). Asked once per space, at its first join. Null or absent: the back's MAX_USERS_FOR_WEBRTC.",
    }),
});

export type LivekitCredentialsResponse = z.infer<typeof LivekitCredentialsResponse>;
