import { ADMIN_API_TOKEN } from "../enums/EnvironmentVariable";
import { stringify } from "flatted";
import { socketManager } from "../services/SocketManager";
import { BaseHttpController } from "./BaseHttpController";

export class DebugController extends BaseHttpController {
    routes(): void {
        this.app.get("/dump", (req, res) => {
            if (ADMIN_API_TOKEN === "") {
                res.status(401).send("No token configured!");
                return;
            }
            if (req.query.token !== ADMIN_API_TOKEN) {
                res.status(401).send("Invalid token sent!");
                return;
            }

            const worlds = Object.fromEntries(socketManager.getWorlds().entries());

            res.json(
                stringify(worlds, (key: unknown, value: unknown) => {
                    if (value instanceof Map) {
                        const obj: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
                        for (const [mapKey, mapValue] of value.entries()) {
                            obj[mapKey] = mapValue;
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
            return;
        });
    }
}
