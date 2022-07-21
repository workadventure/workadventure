import { BaseHttpController } from "./BaseHttpController";
import { parse } from "query-string";
import { wokaService } from "../Services/WokaService";
import { jwtTokenManager } from "../Services/JWTTokenManager";

export class WokaListController extends BaseHttpController {
    routes(): void {
        this.app.options("/woka/list", {}, (req, res) => {
            res.status(200).send("");
            return;
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/woka/list", {}, async (req, res) => {
            const token = req.header("Authorization");

            if (!token) {
                res.status(401).send("Undefined authorization header");
                return;
            }

            try {
                const jwtData = jwtTokenManager.verifyJWTToken(token);
                // Let's set the "uuid" param
                req.params["uuid"] = jwtData.identifier;
            } catch (e) {
                console.error("Connection refused for token: " + token, e);
                res.status(401).send("Invalid token sent");
                return;
            }

            let { roomUrl } = parse(req.path_query);

            if (typeof roomUrl !== "string") {
                return res.status(400).send("missing roomUrl URL parameter");
            }

            roomUrl = decodeURIComponent(roomUrl);
            const wokaList = await wokaService.getWokaList(roomUrl, req.params["uuid"]);

            if (!wokaList) {
                return res.status(500).send("Error on getting woka list");
            }

            return res.status(200).json(wokaList);
        });
    }
}
