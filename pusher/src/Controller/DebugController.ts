import { ADMIN_API_TOKEN } from "../Enum/EnvironmentVariable";
import { IoSocketController } from "_Controller/IoSocketController";
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
            const query = parse(req.getQuery());

            if (ADMIN_API_TOKEN === "") {
                return res.writeStatus("401 Unauthorized").end("No token configured!");
            }
            if (query.token !== ADMIN_API_TOKEN) {
                return res.writeStatus("401 Unauthorized").end("Invalid token sent!");
            }

            const worlds = Object.fromEntries(socketManager.getWorlds().entries());

            return res
                .writeStatus("200 OK")
                .writeHeader("Content-Type", "application/json")
                .end(
                    stringify(worlds, (key: unknown, value: unknown) => {
                        if (value instanceof Map) {
                            const obj: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
                            for (const [mapKey, mapValue] of value.entries()) {
                                obj[mapKey] = mapValue;
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
                    })
                );
        });
    }
}
