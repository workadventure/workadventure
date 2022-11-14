import { MapStorageClient } from "@workadventure/legacy-proto-messages/dist/services_grpc_pb.js";
import * as grpc from "@grpc/grpc-js";
import { ENABLE_FEATURE_MAP_EDITOR, MAP_STORAGE_URL } from "../Enum/EnvironmentVariable.js";

if (ENABLE_FEATURE_MAP_EDITOR) {
    console.log(`%%%%%%%%% MAP STORAGE URL: ${MAP_STORAGE_URL}`);
}

let mapStorageClient: MapStorageClient;

export function getMapStorageClient(): MapStorageClient {
    if (!mapStorageClient) {
        mapStorageClient = new MapStorageClient(MAP_STORAGE_URL, grpc.credentials.createInsecure());
    }
    return mapStorageClient;
}
