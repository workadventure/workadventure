import { MapStorageClient } from "../Messages/generated/messages_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import { ENABLE_FEATURE_MAP_EDITOR, MAP_STORAGE_URL } from "../Enum/EnvironmentVariable";

if (ENABLE_FEATURE_MAP_EDITOR) {
    console.log(`%%%%%%%%% MAP STORAGE URL: ${MAP_STORAGE_URL}`);
}

export const mapStorageClient = new MapStorageClient(MAP_STORAGE_URL, grpc.credentials.createInsecure());
