import { dumpVariable } from "@workadventure/shared-utils/src/Debug/dumpVariable";
import { Express, Request, Response, NextFunction } from "express";
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

    constructor(private app: Express) {
        this.getDump();
        this.enableDebug();
        this.disableDebug();
    }

    private getDump() {
        this.app.get("/dump", validateTokenMiddleware, (req: Request, res: Response): void => {
            res.status(200).send(
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
}
