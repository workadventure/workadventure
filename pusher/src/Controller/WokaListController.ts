import { BaseHttpController } from "./BaseHttpController";
import { wokaService } from "../Services/WokaService";
import * as tg from "generic-type-guard";

export class WokaListController extends BaseHttpController {
    routes() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/woka/list/:roomId", {}, async (req, res) => {
            const token = req.header("Authorization");

            if (!token) {
                res.status(401).send("Undefined authorization header");
                return;
            }

            const isParameters = new tg.IsInterface()
                .withProperties({
                    roomId: tg.isString,
                })
                .withOptionalProperties({
                    messages: tg.isArray(tg.isUnknown),
                })
                .get();

            if (!isParameters(req.path_parameters)) {
                return res.status(400).send("Unknown parameters");
            }

            const roomId = req.path_parameters.roomId;
            const wokaList = await wokaService.getWokaList(roomId, token);

            if (!wokaList) {
                return res.status(500).send("Error on getting woka list");
            }

            return res.status(200).json(wokaList);
        });
    }
}
