import * as fs from "fs";
import * as Sentry from "@sentry/node";
import * as grpc from "@grpc/grpc-js";
import express from "express";
import cors from "cors";
import { MapStorageService } from "@workadventure/messages/src/ts-proto-generated/services";
import passport from "passport";
import bodyParser from "body-parser";
import { setErrorHandler } from "@workadventure/shared-utils/src/ErrorHandler";
import { mapStorageServer } from "./MapStorageServer";
import { mapsManager } from "./MapsManager";
import { proxyFiles } from "./FileFetcher/FileFetcher";
import { UploadController } from "./Upload/UploadController";
import { fileSystem } from "./fileSystem";
import { passportStrategies } from "./Services/Authentication";
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

        setErrorHandler((error: Error) => {
            console.error(`[${new Date().toISOString()}]`, error);
            Sentry.captureException(error);
        });

        console.info(`[${new Date().toISOString()}] Sentry initialized`);
    } catch (e) {
        console.error(`[${new Date().toISOString()}] Error while initializing Sentry`, e);
    }
}
import { MapListService } from "./Services/MapListService";
import { WebHookService } from "./Services/WebHookService";
import { PingController } from "./Upload/PingController";
import { ResourceUrlModule } from "./Modules/ResourceUrlModule";
import { hookManager } from "./Modules/HookManager";
import { FileModule } from "./Modules/FileModule";

const resourceUrlModule = new ResourceUrlModule();
resourceUrlModule.init(hookManager);

const fileModule = new FileModule();
fileModule.init(hookManager);

const server = new grpc.Server();
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
server.addService(MapStorageService, mapStorageServer);

server.bindAsync(`0.0.0.0:50053`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err;
    }
    console.log(`[${new Date().toISOString()}] Application is running`);
    console.log(`[${new Date().toISOString()}] gRPC port is 50053`);
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

for (const passportStrategy of passportStrategies) {
    passport.use(passportStrategy);
}
app.use(passport.initialize());

app.get("*.wam", (req, res, next) => {
    const wamPath = req.url;
    const domain = req.hostname;
    if (wamPath.includes("..") || domain.includes("..")) {
        res.status(400).send("Invalid request");
        return;
    }
    const key = mapPathUsingDomain(wamPath, domain);

    res.setHeader("Content-Type", "application/json");
    // Let's disable any kind of cache (we allow for a 5 seconds cache just to avoid spamming the server and
    // to allow a CDN to take over the load). 5 seconds is ok, because it is lower than the 30 seconds of
    // the command queue.
    res.setHeader("Cache-Control", "max-age=5");

    // Maybe the map is already in memory (in case this map is edited by the current map storage)
    const gameMap = mapsManager.getGameMap(key);
    if (gameMap) {
        res.send(gameMap.getWam());
    } else {
        // Let's load the map, but do not put it in memory (because it might become outdated if another map-storage
        // changes the map)
        fileSystem.serveStaticFile(key, res, next);
    }
});

app.get("/ping", (req, res) => {
    res.send("pong");
});

const mapListService = new MapListService(fileSystem, new WebHookService(WEB_HOOK_URL));
new UploadController(app, fileSystem, mapListService);
new ValidatorController(app);
new PingController(app);

app.use(proxyFiles(fileSystem));

// Check that the dist-ui directory exists
if (fs.existsSync("dist-ui")) {
    app.use("/ui", express.static("dist-ui"));
    app.get("/ui/*", (req, res) => {
        res.sendFile("index.html", { root: "dist-ui" });
    });
}

app.listen(3000, () => {
    console.log(`[${new Date().toISOString()}] Application is running on port 3000`);
});
