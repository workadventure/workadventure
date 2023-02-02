// lib/server.ts
import App from "./src/App";
import * as grpc from "@grpc/grpc-js";
import { roomManager } from "./src/RoomManager";
import { RoomManagerService } from "./src/Messages/generated/services_grpc_pb";
import { HTTP_PORT, GRPC_PORT } from "./src/Enum/EnvironmentVariable";

App.listen(HTTP_PORT, () => console.log(`WorkAdventure HTTP API starting on port %d!`, HTTP_PORT));

const server = new grpc.Server();
server.addService(RoomManagerService, roomManager);

server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err;
    }
    console.log("WorkAdventure HTTP/2 API starting on port %d!", GRPC_PORT);
    server.start();
});
