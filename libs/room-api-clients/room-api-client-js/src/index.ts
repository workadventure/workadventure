export * from "./compiled_proto/room-api";
import {ChannelCredentials, createChannel, createClient, Metadata} from "nice-grpc";
import { RoomApiClient, RoomApiDefinition } from "./compiled_proto/room-api";

export const createRoomApiClient = (apiKey: string, host = "room-api.workadventu.re", port = 80) => {
    const channel = createChannel(`${host}:${port}`, ChannelCredentials.createInsecure());
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
