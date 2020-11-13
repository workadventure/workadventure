// lib/server.ts
import App from "./src/App";
import grpc from "grpc";
import {roomManager} from "./src/RoomManager";
import {IRoomManagerServer, RoomManagerService} from "./src/Messages/generated/messages_grpc_pb";

//App.listen(8080, () => console.log(`WorkAdventure starting on port 8080!`))

const server = new grpc.Server();
server.addService<IRoomManagerServer>(RoomManagerService, roomManager);

server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
server.start();
