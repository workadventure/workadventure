import * as fs from "fs";
import * as Sentry from "@sentry/node";
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
import {
    SENTRY_DSN,
    SENTRY_RELEASE,
    WEB_HOOK_URL,
    SENTRY_TRACES_SAMPLE_RATE,
    SENTRY_ENVIRONMENT,
} from "./Enum/EnvironmentVariable";

// Sentry integration
if (SENTRY_DSN != undefined) {
    try {
        const sentryOptions: Sentry.NodeOptions = {
            dsn: SENTRY_DSN,
            release: SENTRY_RELEASE,
            environment: SENTRY_ENVIRONMENT,
            tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
        };

        Sentry.init(sentryOptions);
        console.info("Sentry initialized");
    } catch (e) {
        console.error("Error while initializing Sentry", e);
    }
}
import { MapListService } from "./Services/MapListService";
import { WebHookService } from "./Services/WebHookService";

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
// We need to trust the proxy in order to be able to bind the "X-Forwarded-Host" header to the hostname.
app.set("trust proxy", true);
app.use(cors());
app.use((request, response, next) => {
    response.set("X-Content-Type-Options", "nosniff");
    next();
});
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

app.get("/ping", (req, res) => {
    res.send("pong");
});

const mapListService = new MapListService(fileSystem, new WebHookService(WEB_HOOK_URL));
new UploadController(app, fileSystem, mapListService);
new ValidatorController(app);

app.use(proxyFiles(fileSystem));

// Check that the dist-ui directory exists
if (fs.existsSync("dist-ui")) {
    app.use("/ui", express.static("dist-ui"));
    app.get("/ui/*", (req, res) => {
        res.sendFile("index.html", { root: "dist-ui" });
    });
}

app.listen(3000, () => {
    console.log("Application is running on port 3000");
});
