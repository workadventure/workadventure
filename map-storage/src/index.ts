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
    GRPC_MAX_MESSAGE_SIZE,
    BODY_PARSER_JSON_SIZE_LIMIT,
    AWS_BUCKET,
} from "./Enum/EnvironmentVariable";
import { createProbeS3Client, getS3Client, hasS3Bucket } from "./Services/S3Client";
import { S3HealthCheck } from "./Services/S3HealthCheck";

// Sentry integration
if (SENTRY_DSN != undefined) {
    try {
        const sentryOptions: Sentry.NodeOptions = {
            dsn: SENTRY_DSN,
            release: SENTRY_RELEASE,
            environment: SENTRY_ENVIRONMENT,
            tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
            attachStacktrace: true,
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
import { verifyJWT } from "./Services/VerifyJwt";

const resourceUrlModule = new ResourceUrlModule();
resourceUrlModule.init(hookManager);

const fileModule = new FileModule();
fileModule.init(hookManager);

const server = new grpc.Server({
    "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE, // 20 MB
    "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE, // 20 MB
});
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
server.addService(MapStorageService, mapStorageServer);

server.bindAsync(`0.0.0.0:50053`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err;
    }
    console.info(`[${new Date().toISOString()}] Application is running`);
    console.info(`[${new Date().toISOString()}] gRPC port is 50053`);
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
        limit: BODY_PARSER_JSON_SIZE_LIMIT,
    }),
);

for (const passportStrategy of passportStrategies) {
    passport.use(passportStrategy);
}
app.use(passport.initialize());

app.get(/.*\.wam$/, (req, res, next) => {
    const wamPath = req.path;
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

    // Let's load the map, but do not put it in memory (because it might become outdated if another map-storage
    // changes the map)
    fileSystem.serveStaticFile(key, res, next);
});

// On-demand S3 connectivity checks. Kubernetes drives the cadence and the consecutive-failure
// counting via its probe config; the endpoints below just run a live check when polled, so a wedged
// S3 connection pool (see INCIDENT_map-storage_s3_agent_exhaustion) is taken out of rotation and, if
// S3 is still reachable, restarted — instead of silently serving 500s.
const s3HealthCheck =
    hasS3Bucket() && AWS_BUCKET ? new S3HealthCheck(getS3Client(), AWS_BUCKET, createProbeS3Client) : undefined;

// Readiness probe: fail (503) when the shared S3 pool cannot answer right now, so Kubernetes stops
// routing traffic to this pod. Kubernetes' readinessProbe.failureThreshold smooths transient blips.
app.get("/ping", (req, res, next) => {
    if (!s3HealthCheck) {
        res.send("pong");
        return;
    }
    s3HealthCheck
        .isReachable()
        .then((reachable) => {
            if (reachable) {
                res.send("pong");
            } else {
                res.status(503).send("S3 unreachable");
            }
        })
        .catch(next);
});

// Liveness probe: fail (503) only when the pool is provably *wedged* (S3 reachable via a fresh pool
// while the shared pool is stuck), so Kubernetes restarts the pod to clear it. A real S3 outage
// leaves this healthy, avoiding a fleet-wide restart loop. Kubernetes' livenessProbe.failureThreshold
// requires several consecutive failures before acting.
app.get("/health/live", (req, res, next) => {
    if (!s3HealthCheck) {
        res.send("ok");
        return;
    }
    s3HealthCheck
        .isWedged()
        .then((wedged) => {
            if (wedged) {
                console.error(
                    `[${new Date().toISOString()}] S3 connection pool wedged — failing liveness so Kubernetes restarts this pod (see INCIDENT_map-storage_s3_agent_exhaustion)`,
                );
                res.status(503).send("S3 connection pool wedged");
            } else {
                res.send("ok");
            }
        })
        .catch(next);
});

const mapListService = new MapListService(fileSystem, new WebHookService(WEB_HOOK_URL));
new UploadController(app, fileSystem, mapListService);
new ValidatorController(app);
new PingController(app);

app.get(
    "/private/files/{*splat}",
    (req, res, next) => {
        Promise.resolve(verifyJWT(req, res, next)).catch(next);
    },
    proxyFiles(fileSystem),
);

app.use(proxyFiles(fileSystem));

// Check that the dist-ui directory exists
if (fs.existsSync("dist-ui")) {
    app.use("/ui", express.static("dist-ui"));
    app.get("/ui/{*splat}", (req, res, next) => {
        res.sendFile("index.html", { root: "dist-ui" });
    });
}

// Error-handling middlewares. They must be registered last, after all routes.

// Capture route errors in Sentry, then delegate to the next error handler.
Sentry.setupExpressErrorHandler(app);

// Force error responses to be non-cacheable, then delegate to Express's default error handler
// (which logs the stack and sends the 500).
// Routes like `proxyFiles` set an aggressive `Cache-Control` header (e.g.
// "public, max-age=31536000, immutable") *before* the file is fetched. If the fetch then fails
// (e.g. a transient S3 outage) the request ends up here as a 500. Without overriding the header,
// the browser/CDN would cache that 500 for up to a year and keep serving it even after S3 recovers.
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!res.headersSent) {
        res.setHeader("Cache-Control", "no-store");
    }
    next(err);
});

app.listen(3000, () => {
    console.info(`[${new Date().toISOString()}] Application is running on port 3000`);
});
