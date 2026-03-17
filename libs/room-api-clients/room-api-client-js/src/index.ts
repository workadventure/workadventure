export * from "./compiled_proto/room-api.ts";
import { ChannelCredentials, createChannel, createClient, Metadata } from "nice-grpc";
import type { RoomApiClient } from "./compiled_proto/room-api.ts";
import { RoomApiDefinition } from "./compiled_proto/room-api.ts";

export const createRoomApiClient = (apiKey: string, host = "room-api.workadventu.re", port = 443) => {
    const url = host.includes("://") ? new URL(host) : undefined;
    const hostname = url?.hostname ?? host;
    const isSecure = url?.protocol === "https:" || (!url && port === 443);
    const verifyOptions = process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ? { rejectUnauthorized: false } : undefined;
    const credentials = isSecure
        ? ChannelCredentials.createSsl(undefined, undefined, undefined, verifyOptions)
        : ChannelCredentials.createInsecure();

    const channel = createChannel(`${hostname}:${port}`, credentials);
    const client: RoomApiClient = createClient(RoomApiDefinition, channel, {
        "*": {
            metadata: new Metadata({ "X-API-Key": apiKey }),
        },
    });

    return client;
};
