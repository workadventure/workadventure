import { stringify } from "circular-json";
import { ADMIN_API_TOKEN } from "../enums/EnvironmentVariable";
import { socketManager } from "../services/SocketManager";
import { CustomJsonReplacerInterface } from "../models/CustomJsonReplacerInterface";
import { BaseHttpController } from "./BaseHttpController";

export class DebugController extends BaseHttpController {
    routes(): void {
        this.app.get("/dump", (req, res) => {
            if (!ADMIN_API_TOKEN) {
                res.atomic(() => {
                    res.status(401).send("No token configured!");
                });
                return;
            }
            if (req.query.token !== ADMIN_API_TOKEN) {
                res.atomic(() => {
                    res.status(401).send("Invalid token sent!");
                });
                return;
            }

            res.atomic(() => {
                res.header("Content-Type", "application/json");

                res.send(
                    stringify(socketManager, function (key: unknown, value: unknown) {
                        const customObj = CustomJsonReplacerInterface.safeParse(this);
                        if (customObj.success) {
                            const val = customObj.data.customJsonReplacer(key, value);
                            if (val !== undefined) {
                                return val;
                            }
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
                            for (const setValue of value.values()) {
                                obj.push(setValue);
                            }
                            return obj;
                        } else {
                            return value;
                        }
                    })
                );
            });
            return;
        });
    }
}
