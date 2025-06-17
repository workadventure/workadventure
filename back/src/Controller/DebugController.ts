import { dumpVariable } from "@workadventure/shared-utils/src/Debug/dumpVariable";
import { Express, Request, Response } from "express";
import { parse } from "query-string";
import debug from "debug";
import { ADMIN_API_TOKEN } from "../Enum/EnvironmentVariable";
import { socketManager } from "../Services/SocketManager";

export class DebugController {
    private debugTimeout: NodeJS.Timeout | undefined;

    constructor(private app: Express) {
        this.getDump();
        this.enableDebug();
        this.disableDebug();
    }

    private validateToken(req: Request, res: Response): boolean {
        if (!ADMIN_API_TOKEN) {
            res.status(401).send("No token configured!");
            return false;
        }

        const query = parse(req.url.split("?")[1] || "");
        if (query.token !== ADMIN_API_TOKEN) {
            res.status(401).send("Invalid token sent!");
            return false;
        }

        return true;
    }

    private getDump() {
        this.app.get("/dump", (req: Request, res: Response): void => {
            if (!this.validateToken(req, res)) return;

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
        this.app.put("/debug/enable", (req: Request, res: Response): void => {
            if (!this.validateToken(req, res)) return;

            const query = parse(req.url.split("?")[1] || "");
            let namespaces = "*";

            if (query.namespaces) {
                namespaces = Array.isArray(query.namespaces) ? query.namespaces.join(",") : query.namespaces;
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
        this.app.put("/debug/disable", (req: Request, res: Response): void => {
            if (!this.validateToken(req, res)) return;

            debug.disable();

            if (this.debugTimeout) {
                clearTimeout(this.debugTimeout);
                this.debugTimeout = undefined;
            }

            res.status(200).send("Debug disabled");
        });
    }
}
