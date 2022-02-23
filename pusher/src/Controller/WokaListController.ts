import { hasToken } from "../Middleware/HasToken";
import { BaseHttpController } from "./BaseHttpController";
import { wokaService } from "../Services/WokaService";

export class WokaListController extends BaseHttpController {
    routes() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/woka-list", {}, async (req, res) => {
            const token = req.header("Authorization");
            const wokaList = await wokaService.getWokaList(token);

            if (!wokaList) {
                return res.status(500).send("Error on getting woka list");
            }

            return res.status(200).json(wokaList);
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        /*this.app.post("/woka-details", async (req, res) => {
            const body = await req.json();
            if (!body || !body.textureIds) {
                return res.status(400);
            }

            const textureIds = body.textureIds;
            const wokaDetails = await wokaService.fetchWokaDetails(textureIds);

            if (!wokaDetails) {
                return res.json({ details: [] });
            }

            return res.json(wokaDetails);
        });*/
    }
}
