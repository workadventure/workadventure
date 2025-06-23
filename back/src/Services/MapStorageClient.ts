import { MapStorageClient } from "@workadventure/messages/src/ts-proto-generated/services";
import * as grpc from "@grpc/grpc-js";
import { MAP_STORAGE_URL } from "../Enum/EnvironmentVariable";

let mapStorageClient: MapStorageClient;

export function getMapStorageClient(): MapStorageClient {
    if (!mapStorageClient) {
        if (!MAP_STORAGE_URL) {
            throw new Error("MAP_STORAGE_URL is not configured");
        }
        mapStorageClient = new MapStorageClient(MAP_STORAGE_URL, grpc.credentials.createInsecure(), {
            "grpc.max_receive_message_length": 20 * 1024 * 1024, // 20 MB
            "grpc.max_send_message_length": 20 * 1024 * 1024, // 20 MB
        });
    }
    return mapStorageClient;
}
