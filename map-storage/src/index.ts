import * as grpc from "@grpc/grpc-js";
import express from "express";
import cors from "cors";
import { MapStorageService } from "@workadventure/messages/src/ts-proto-generated/services";
import passport from "passport";
import bodyParser from "body-parser";
import { WAMFileFormat } from "@workadventure/map-editor";
import { mapStorageServer } from "./MapStorageServer";
import { mapsManager } from "./MapsManager";
import { proxyFiles } from "./FileFetcher/FileFetcher";
import { UploadController } from "./Upload/UploadController";
import { fileSystem } from "./fileSystem";
import { passportStrategy } from "./Services/Authentication";
import { mapPathUsingDomain } from "./Services/PathMapper";
import { ValidatorController } from "./Upload/ValidatorController";

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
app.use(
    bodyParser.json({
        type: ["application/json", "application/json-patch+json"],
    })
);

passport.use(passportStrategy);
app.use(passport.initialize());

app.get("*.wam", (req, res, next) => {
    (async () => {
        const wamPath = req.url;
        const domain = req.hostname;
        if (wamPath.includes("..") || domain.includes("..")) {
            res.status(400).send("Invalid request");
            return;
        }
        const key = mapPathUsingDomain(wamPath, domain);
        const file = await fileSystem.readFileAsString(key);
        const wam = WAMFileFormat.parse(JSON.parse(file));

        if (!mapsManager.isMapAlreadyLoaded(key)) {
            mapsManager.loadWAMToMemory(key, wam);
        }
        res.send(wam);
    })().catch((e) => next());
});

app.get("/entityCollections", (req, res) => {
    res.send(mapsManager.getEntityCollections());
});

new UploadController(app, fileSystem);
new ValidatorController(app);

app.use(proxyFiles(fileSystem));

app.listen(3000, () => {
    console.log("Application is running on port 3000");
});
