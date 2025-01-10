import { dumpVariable } from "@workadventure/shared-utils/src/Debug/dumpVariable";
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { parse } from "query-string";
import debug from "debug";
import { ADMIN_API_TOKEN } from "../Enum/EnvironmentVariable";
import { App } from "../Server/sifrr.server";
import { socketManager } from "../Services/SocketManager";

export class DebugController {
    private debugTimeout: NodeJS.Timeout | undefined;

    constructor(private App: App) {
        this.getDump();
        this.enableDebug();
        this.disableDebug();
    }

    getDump() {
        this.App.get("/dump", (res: HttpResponse, req: HttpRequest): void => {
            const query = parse(req.getQuery());

            if (!ADMIN_API_TOKEN) {
                res.writeStatus("401 Unauthorized").end("No token configured!");
                return;
            }
            if (query.token !== ADMIN_API_TOKEN) {
                res.writeStatus("401 Unauthorized").end("Invalid token sent!");
                return;
            }

            res.writeStatus("200 OK").end(
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
            return;
        });
    }

    enableDebug() {
        this.App.put("/debug/enable", (res: HttpResponse, req: HttpRequest): void => {
            const query = parse(req.getQuery());

            if (!ADMIN_API_TOKEN) {
                res.writeStatus("401 Unauthorized").end("No token configured!");
                return;
            }

            if (query.token !== ADMIN_API_TOKEN) {
                res.writeStatus("401 Unauthorized").end("Invalid token sent!");
                return;
            }

            let namespaces = "*";

            if (query.namespaces) {
                namespaces = Array.isArray(query.namespaces) ? query.namespaces.join(",") : query.namespaces;
            }

            debug.enable(namespaces);

            const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

            this.debugTimeout = setTimeout(() => {
                debug.disable();
            }, ONE_DAY_IN_MS);

            res.writeStatus("200 OK").end("Active debug");
        });
    }
    disableDebug() {
        this.App.put("/debug/disable", (res: HttpResponse, req: HttpRequest): void => {
            const query = parse(req.getQuery());

            if (!ADMIN_API_TOKEN) {
                res.writeStatus("401 Unauthorized").end("No token configured!");
                return;
            }

            if (query.token !== ADMIN_API_TOKEN) {
                res.writeStatus("401 Unauthorized").end("Invalid token sent!");
                return;
            }

            debug.disable();

            if (this.debugTimeout) {
                clearTimeout(this.debugTimeout);
                this.debugTimeout = undefined;
            }

            res.writeStatus("200 OK").end("Debug disabled");
        });
    }
}
