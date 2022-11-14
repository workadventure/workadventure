import App from "./src/App.js";
import * as grpc from "@grpc/grpc-js";
import { roomManager } from "./src/RoomManager.js";
import { RoomManagerService } from "@workadventure/legacy-proto-messages/dist/services_grpc_pb.js";
import { HTTP_PORT, GRPC_PORT } from "./src/Enum/EnvironmentVariable.js";

App.listen(HTTP_PORT, () => console.log(`WorkAdventure HTTP API starting on port %d!`, HTTP_PORT));

const server = new grpc.Server();
//@ts-ignore
server.addService(RoomManagerService, roomManager);

server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err;
    }
    console.log("WorkAdventure HTTP/2 API starting on port %d!", GRPC_PORT);
    server.start();
});

export {};
