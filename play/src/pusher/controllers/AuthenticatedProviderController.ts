import {BaseHttpController} from "./BaseHttpController";
import {parse} from "query-string";
import {jwtTokenManager} from "../Services/JWTTokenManager";
import Request from "hyper-express/types/components/http/Request";
import Response from "hyper-express/types/components/http/Response";

/*
 * Base class to expose authenticated pusher endpoints that will provide data based on room url
 */
export abstract class AuthenticatedProviderController<T> extends BaseHttpController {
    /**
     * Setup authenticated routes that take at least the room url query parameter
     * @param endpoint
     */
    setupRoutes(endpoint: string): void {
        this.app.options(endpoint, {}, (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get(endpoint, {}, async (req, res) => {
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
            const data = await this.getData(roomUrl, req);

            if (!data) {
                return res.status(500).send("Error on getting data");
            }

            return res.status(200).json(data);
        });
    }

    protected abstract getData(roomUrl: string, req: Request): Promise<T|undefined>;
}
