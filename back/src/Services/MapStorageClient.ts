import { MapStorageClient } from "@workadventure/messages/src/ts-proto-generated/services";
import * as grpc from "@grpc/grpc-js";
import { MAP_STORAGE_URL, GRPC_MAX_MESSAGE_SIZE } from "../Enum/EnvironmentVariable";

let mapStorageClient: MapStorageClient;

export function getMapStorageClient(): MapStorageClient {
    if (!mapStorageClient) {
        if (!MAP_STORAGE_URL) {
            throw new Error("MAP_STORAGE_URL is not configured");
        }
        mapStorageClient = new MapStorageClient(MAP_STORAGE_URL, grpc.credentials.createInsecure(), {
            "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE, // 20 MB
            "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE, // 20 MB
        });
    }
    return mapStorageClient;
}
