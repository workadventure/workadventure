import { dumpVariable } from "@workadventure/shared-utils/src/Debug/dumpVariable";
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { parse } from "query-string";
import { ADMIN_API_TOKEN } from "../Enum/EnvironmentVariable";
import { App } from "../Server/sifrr.server";
import { socketManager } from "../Services/SocketManager";

export class DebugController {
    constructor(private App: App) {
        this.getDump();
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
}
