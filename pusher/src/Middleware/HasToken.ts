import Request from "hyper-express/types/components/http/Request";
import Response from "hyper-express/types/components/http/Response";
import { MiddlewareNext, MiddlewarePromise } from "hyper-express/types/components/router/Router";

export function hasToken(req: Request, res: Response, next?: MiddlewareNext): MiddlewarePromise {
    const authorizationHeader = req.header("Authorization");

    if (!authorizationHeader) {
        res.status(401).send("Undefined authorization header");
        return;
    }

    if (next) {
        next();
    }
}
