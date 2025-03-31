import { dumpVariable } from "@workadventure/shared-utils/src/Debug/dumpVariable";
import { ADMIN_API_TOKEN } from "../enums/EnvironmentVariable";
import { socketManager } from "../services/SocketManager";
import { BaseHttpController } from "./BaseHttpController";

export class DebugController extends BaseHttpController {
    routes(): void {
        this.app.get("/dump", (req, res) => {
            if (!ADMIN_API_TOKEN) {
                res.status(401).send("No token configured!");
                return;
            }
            if (req.query.token !== ADMIN_API_TOKEN) {
                res.status(401).send("Invalid token sent!");
                return;
            }

            //res.header("Content-Type", "application/json");

            res.send(
                dumpVariable(socketManager, (originalValue) => {
                    if (originalValue && typeof originalValue === "object" && originalValue.constructor) {
                        if (originalValue.constructor.name === "uWS.WebSocket") {
                            return "WebSocket";
                        } else if (originalValue.constructor.name === "ClientDuplexStreamImpl") {
                            return "ClientDuplexStreamImpl";
                        } else if (originalValue.constructor.name === "ClientReadableStreamImpl") {
                            return "ClientReadableStreamImpl";
                        }
                    }
                    return originalValue;
                })
            );
            return;
        });
    }
}
