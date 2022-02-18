// lib/server.ts
import App from "./src/App";
import grpc from "grpc";
import { roomManager } from "./src/RoomManager";
import { IRoomManagerServer, RoomManagerService } from "./src/Messages/generated/messages_grpc_pb";
import { HTTP_PORT, GRPC_PORT } from "./src/Enum/EnvironmentVariable";

App.listen(HTTP_PORT, () => console.log(`WorkAdventure HTTP API starting on port %d!`, HTTP_PORT));

const server = new grpc.Server();
server.addService<IRoomManagerServer>(RoomManagerService, roomManager);

server.bind(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure());
server.start();
console.log("WorkAdventure HTTP/2 API starting on port %d!", GRPC_PORT);
