import { hasToken } from "../Middleware/HasToken";
import { BaseHttpController } from "./BaseHttpController";
import { ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import { adminWokaService } from "..//Services/AdminWokaService";
import { localWokaService } from "..//Services/LocalWokaService";
import { WokaServiceInterface } from "src/Services/WokaServiceInterface";
import { Server } from "hyper-express";

export class WokaListController extends BaseHttpController {
    private wokaService: WokaServiceInterface;

    constructor(app: Server) {
        super(app);
        this.wokaService = ADMIN_API_URL ? adminWokaService : localWokaService;
    }

    routes() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/woka-list", { middlewares: [hasToken] }, async (req, res) => {
            const token = req.header("Authorization");
            const wokaList = await this.wokaService.getWokaList(token);

            if (!wokaList) {
                return res.status(500).send("Error on getting woka list");
            }

            return res.status(200).json(wokaList);
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.post("/woka-details", async (req, res) => {
            const body = await req.json();
            if (!body || !body.textureIds) {
                return res.status(400);
            }

            const textureIds = body.textureIds;
            const wokaDetails = await this.wokaService.fetchWokaDetails(textureIds);

            if (!wokaDetails) {
                return res.json({ details: [] });
            }

            return res.json(wokaDetails);
        });
    }
}
