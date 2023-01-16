import * as grpc from "@grpc/grpc-js";
import express from "express";
import cors from "cors";
import { mapStorageServer } from "./MapStorageServer";
import { mapsManager } from "./MapsManager";
import { MapStorageService } from "@workadventure/messages/src/ts-proto-generated/services";
import { proxyFiles } from "./FileFetcher/FileFetcher";
import { UploadController } from "./Upload/UploadController";
import { fileSystem } from "./fileSystem";
import passport from "passport";
import { passportStrategy } from "./Services/Authentication";
import { mapPathUsingDomain } from "./Services/PathMapper";
import { ITiledMap } from "@workadventure/tiled-map-type-guard";

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

passport.use(passportStrategy);
app.use(passport.initialize());

app.get("*.tmj", (req, res, next) => {
    (async () => {
        const path = req.url;
        const domain = req.hostname;
        if (path.includes("..") || domain.includes("..")) {
            res.status(400).send("Invalid request");
            return;
        }
        const key = mapPathUsingDomain(path, domain);
        const file = await fileSystem.readFileAsString(key);
        const map = ITiledMap.parse(JSON.parse(file));

        if (!mapsManager.isMapAlreadyLoaded(key)) {
            mapsManager.loadMapToMemory(key, map);
        }
        res.send(map);
    })().catch((e) => next());
});

app.get("/entityCollections/*", (req, res) => {
    const url = new URL(`${req.protocol}://${req.get("host") ?? ""}${req.originalUrl}`);
    const collectionName = decodeURI(url.pathname).split("/").pop() ?? "";
    const collection = mapsManager.getEntityCollection(collectionName);
    if (collection) {
        res.send(collection);
    } else {
        res.send(`COULD NOT FIND COLLECTION: ${collectionName}`);
    }
});

app.get("/entityCollections", (req, res) => {
    res.send({
        collections: mapsManager.getEntityCollectionsNames(),
    });
});

new UploadController(app, fileSystem);

app.use(proxyFiles(fileSystem));

app.listen(3000, () => {
    console.log("Application is running on port 3000");
});
