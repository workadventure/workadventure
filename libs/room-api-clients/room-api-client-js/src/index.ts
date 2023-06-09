export * from "./compiled_proto/room-api";
import {ChannelCredentials, createChannel, createClient, Metadata} from "nice-grpc";
import { RoomApiClient, RoomApiDefinition } from "./compiled_proto/room-api";

export const createRoomApiClient = (apiKey: string, host = "room-api.workadventu.re", port = 443) => {
    const channel = createChannel(`${host}:${port}`, port === 443 || host.startsWith("https://") ? ChannelCredentials.createSsl() : ChannelCredentials.createInsecure());
    const client: RoomApiClient = createClient(
        RoomApiDefinition,
        channel,
        {
            "*": {
                metadata: new Metadata({"X-API-Key": apiKey}),
            }
        }
    );

    return client;
};
