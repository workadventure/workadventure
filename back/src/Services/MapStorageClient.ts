import { MapStorageClient } from "../Messages/generated/services_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import { MAP_STORAGE_URL } from "../Enum/EnvironmentVariable";

let mapStorageClient: MapStorageClient;

export function getMapStorageClient(): MapStorageClient {
    if (!mapStorageClient) {
        if (!MAP_STORAGE_URL) {
            throw new Error("MAP_STORAGE_URL is not configured");
        }
        mapStorageClient = new MapStorageClient(MAP_STORAGE_URL, grpc.credentials.createInsecure());
    }
    return mapStorageClient;
}
