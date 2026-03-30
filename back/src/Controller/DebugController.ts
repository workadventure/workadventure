import { dumpVariable } from "@workadventure/shared-utils/src/Debug/dumpVariable";
import type { Express, Request, Response, NextFunction } from "express";
import debug from "debug";
import { ADMIN_API_TOKEN } from "../Enum/EnvironmentVariable";
import { socketManager } from "../Services/SocketManager";

// Middleware pour valider le token d'authentification
const validateTokenMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (!ADMIN_API_TOKEN) {
        res.status(401).send("No token configured!");
        return;
    }

    const query = req.query;
    if (query.token !== ADMIN_API_TOKEN) {
        res.status(401).send("Invalid token sent!");
        return;
    }

    next();
};

export class DebugController {
    private debugTimeout: NodeJS.Timeout | undefined;
    private lagInterval: NodeJS.Timeout | undefined;

    constructor(private app: Express) {
        this.getDump();
        this.enableDebug();
        this.disableDebug();
        this.closeSpaceConnection();
        this.stallEventLoop();
        this.startLagLoop();
        this.stopLagLoop();
    }

    private getDump() {
        this.app.get("/dump", validateTokenMiddleware, (req: Request, res: Response): void => {
            res.status(200)
                .contentType("text/plain")
                .send(
                    dumpVariable(socketManager, (value: unknown) => {
                        if (value && typeof value === "object" && value.constructor) {
                            if (value.constructor.name === "uWS.WebSocket") {
                                return "WebSocket";
                            } else if (value.constructor.name === "ClientDuplexStreamImpl") {
                                return "ClientDuplexStreamImpl";
                            } else if (value.constructor.name === "ClientReadableStreamImpl") {
                                return "ClientReadableStreamImpl";
                            } else if (value.constructor.name === "ServerWritableStreamImpl") {
                                return "ServerWritableStreamImpl";
                            } else if (value.constructor.name === "ServerDuplexStreamImpl") {
                                return "ServerDuplexStreamImpl";
                            } else if (value.constructor.name === "Commander") {
                                return "Commander";
                            }
                        }
                        return value;
                    })
                );
        });
    }

    private enableDebug() {
        this.app.put("/debug/enable", validateTokenMiddleware, (req: Request, res: Response): void => {
            const query = req.query;
            let namespaces = "*";

            if (query.namespaces) {
                if (Array.isArray(query.namespaces)) {
                    namespaces = (query.namespaces as string[]).join(",");
                } else {
                    namespaces = query.namespaces as string;
                }
            }

            debug.enable(namespaces);

            const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

            this.debugTimeout = setTimeout(() => {
                debug.disable();
            }, ONE_DAY_IN_MS);

            res.status(200).send("Active debug");
        });
    }

    private disableDebug() {
        this.app.put("/debug/disable", validateTokenMiddleware, (req: Request, res: Response): void => {
            debug.disable();

            if (this.debugTimeout) {
                clearTimeout(this.debugTimeout);
                this.debugTimeout = undefined;
            }

            res.status(200).send("Debug disabled");
        });
    }

    private closeSpaceConnection() {
        this.app.post("/debug/close-space-connection", validateTokenMiddleware, (req: Request, res: Response): void => {
            const query = req.query;

            if (!query.spaceName) {
                res.status(400).send("Space name is required!");
                return;
            }

            try {
                socketManager.closeSpaceConnection(query.spaceName as string);
            } catch (e) {
                console.error("Error closing space connection", e);
                res.status(500).send("Error closing space connection");
                return;
            }

            res.status(200).send("Space connection closed");
        });
    }

    /**
     * Force the application into a loop that stalls the event loop.
     *
     * From within the container, trigger with:
     *   curl -X POST "http://localhost:8080/debug/stall-event-loop?token=<ADMIN_API_TOKEN>&ms=90000"
     */
    private stallEventLoop() {
        this.app.post("/debug/stall-event-loop", validateTokenMiddleware, (req: Request, res: Response): void => {
            const ms = Number(req.query.ms ?? 90_000);

            if (!Number.isFinite(ms) || ms <= 0) {
                res.status(400).send("A positive 'ms' query parameter is required!");
                return;
            }

            console.warn(`Debug endpoint stalling event loop for ${ms}ms`);
            const end = Date.now() + ms;
            while (Date.now() < end) {
                // Intentionally block the event loop to reproduce production lag behavior.
            }

            res.status(200).send(`Stalled event loop for ${ms}ms`);
        });
    }

    /**
     * Force the application into several loops that stall the event loop.
     *
     * From within the container, trigger with:
     *  curl -X PUT "http://<back-pod>:8080/debug/lag/start?token=<ADMIN_API_TOKEN>&everyMs=2000&blockMs=1500"
     */
    private startLagLoop() {
        this.app.put("/debug/lag/start", validateTokenMiddleware, (req: Request, res: Response): void => {
            const everyMs = Number(req.query.everyMs ?? 2_000);
            const blockMs = Number(req.query.blockMs ?? 1_500);

            if (!Number.isFinite(everyMs) || everyMs <= 0) {
                res.status(400).send("A positive 'everyMs' query parameter is required!");
                return;
            }

            if (!Number.isFinite(blockMs) || blockMs <= 0) {
                res.status(400).send("A positive 'blockMs' query parameter is required!");
                return;
            }

            if (blockMs >= everyMs) {
                res.status(400).send("'blockMs' must be strictly lower than 'everyMs'!");
                return;
            }

            if (this.lagInterval) {
                clearInterval(this.lagInterval);
            }

            console.warn(`Debug lag loop started: blocking ${blockMs}ms every ${everyMs}ms`);
            this.lagInterval = setInterval(() => {
                const end = Date.now() + blockMs;
                while (Date.now() < end) {
                    // Intentionally block the event loop to degrade the whole Node process.
                }
            }, everyMs);

            res.status(200).send(`Started lag loop: blocking ${blockMs}ms every ${everyMs}ms`);
        });
    }

    private stopLagLoop() {
        this.app.put("/debug/lag/stop", validateTokenMiddleware, (_req: Request, res: Response): void => {
            if (this.lagInterval) {
                clearInterval(this.lagInterval);
                this.lagInterval = undefined;
            }

            console.warn("Debug lag loop stopped");
            res.status(200).send("Stopped lag loop");
        });
    }
}
