import type { Request, Response, Server } from "hyper-express";
import { z } from "zod";
import { validateQuery } from "../services/QueryValidator";
import type { JWTTokenManager } from "../services/JWTTokenManager";
import { BaseHttpController } from "./BaseHttpController";

/*
 * Base class to expose authenticated pusher endpoints that will provide data based on room url
 */
export abstract class AuthenticatedProviderController<T> extends BaseHttpController {
    constructor(protected app: Server, protected jwtTokenManager: JWTTokenManager) {
        super(app);
    }
    /**
     * Setup authenticated routes that take at least the room url query parameter
     * @param endpoint
     */
    setupRoutes(endpoint: string): void {
        this.app.options(endpoint, (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        this.app.get(endpoint, async (req, res) => {
            const token = req.header("Authorization");

            if (!token) {
                res.status(401).send("Undefined authorization header");
                return;
            }
            let uuid: string | undefined;
            try {
                const jwtData = this.jwtTokenManager.verifyJWTToken(token);
                // Let's set the "uuid" param
                uuid = jwtData.identifier;
            } catch (e) {
                console.error("Connection refused for token: " + token, e);
                res.status(401).send("Invalid token sent");
                return;
            }

            const query = validateQuery(
                req,
                res,
                z.object({
                    roomUrl: z.string(),
                })
            );

            if (query === undefined) {
                return res.status(400).send("bad roomUrl URL parameter");
            }

            const data = await this.getData(decodeURIComponent(query.roomUrl), uuid);

            if (!data) {
                return res.status(500).send("Error on getting data");
            }

            return res.status(200).json(data);
        });
    }

    protected abstract getData(roomUrl: string, uuid: string): Promise<T | undefined>;
}
