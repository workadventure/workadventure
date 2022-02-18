import { ADMIN_API_TOKEN } from "../Enum/EnvironmentVariable";
import { stringify } from "circular-json";
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { parse } from "query-string";
import { App } from "../Server/sifrr.server";
import { socketManager } from "../Services/SocketManager";

export class DebugController {
    constructor(private App: App) {
        this.getDump();
    }

    getDump() {
        this.App.get("/dump", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                const query = parse(req.getQuery());

                if (ADMIN_API_TOKEN === "") {
                    return res.writeStatus("401 Unauthorized").end("No token configured!");
                }
                if (query.token !== ADMIN_API_TOKEN) {
                    return res.writeStatus("401 Unauthorized").end("Invalid token sent!");
                }

                return res
                    .writeStatus("200 OK")
                    .writeHeader("Content-Type", "application/json")
                    .end(
                        stringify(
                            await Promise.all(socketManager.getWorlds().values()),
                            (key: unknown, value: unknown) => {
                                if (key === "listeners") {
                                    return "Listeners";
                                }
                                if (key === "socket") {
                                    return "Socket";
                                }
                                if (key === "batchedMessages") {
                                    return "BatchedMessages";
                                }
                                if (value instanceof Map) {
                                    const obj: { [key: string | number]: unknown } = {};
                                    for (const [mapKey, mapValue] of value.entries()) {
                                        if (typeof mapKey === "number" || typeof mapKey === "string") {
                                            obj[mapKey] = mapValue;
                                        }
                                    }
                                    return obj;
                                } else if (value instanceof Set) {
                                    const obj: Array<unknown> = [];
                                    for (const [setKey, setValue] of value.entries()) {
                                        obj.push(setValue);
                                    }
                                    return obj;
                                } else {
                                    return value;
                                }
                            }
                        )
                    );
            })().catch((e) => {
                console.error(e);
                res.writeStatus("500");
                res.end("An error occurred");
            });
        });
    }
}
