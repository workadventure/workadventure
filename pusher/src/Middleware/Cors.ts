import Request from "hyper-express/types/components/http/Request";
import Response from "hyper-express/types/components/http/Response";
import { MiddlewareNext, MiddlewarePromise } from "hyper-express/types/components/router/Router";
import { FRONT_URL } from "../Enum/EnvironmentVariable";

export function cors(req: Request, res: Response, next?: MiddlewareNext): MiddlewarePromise {
    res.setHeader(
        "access-control-allow-headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, Pragma, Cache-Control"
    );
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    if (FRONT_URL === "*") {
        res.setHeader("access-control-allow-origin", req.header("Origin"));
    } else {
        res.setHeader("access-control-allow-origin", FRONT_URL);
    }
    res.setHeader("access-control-allow-credentials", "true");

    if (next) {
        next();
    }
}
