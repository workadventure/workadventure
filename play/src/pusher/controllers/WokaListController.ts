import { BaseHttpController } from "./BaseHttpController";
import { wokaService } from "../services/WokaService";
import { jwtTokenManager } from "../services/JWTTokenManager";
import type { Request, Response } from "hyper-express";

export class WokaListController extends BaseHttpController {
    routes(): void {
        this.app.options("/woka/list", (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        this.app.get("/woka/list", async (req: Request, res: Response) => {
            const token = req.header("Authorization");

            if (!token) {
                res.status(401).send("Undefined authorization header");
                return;
            }

            let uuid: string;
            try {
                const jwtData = jwtTokenManager.verifyJWTToken(token);
                // Let's set the "uuid" param
                uuid = jwtData.identifier;
            } catch (e) {
                console.error("Connection refused for token: " + token, e);
                res.status(401).send("Invalid token sent");
                return;
            }

            let { roomUrl } = req.query;

            if (typeof roomUrl !== "string") {
                res.status(400).send("missing roomUrl URL parameter");
                return;
            }

            roomUrl = decodeURIComponent(roomUrl);
            const wokaList = await wokaService.getWokaList(roomUrl, uuid);

            if (!wokaList) {
                res.status(500).send("Error on getting woka list");
                return;
            }

            res.status(200).json(wokaList);
            return;
        });
    }
}
