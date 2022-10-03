import * as grpc from "@grpc/grpc-js";
import express from "express";
import cors from "cors";
import { mapStorageServer } from "./MapStorageServer";
import { mapsManager } from "./MapsManager";
import { MapStorageService } from "./Messages/ts-proto-map-storage-generated/protos/messages";

const server = new grpc.Server();
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
server.addService(MapStorageService, mapStorageServer);

server.bindAsync(`0.0.0.0:50053`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err;
    }
    console.log("Application is running");
    console.log("gRPC port is 50053");
    server.start();
});

const app = express();
app.use(cors());

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get("*.json", async (req, res) => {
    res.send(await mapsManager.getMap(req.url));
});

app.use(express.static("public"));

app.listen(3000, () => {
    console.log("Application is running on port 3000");
});
