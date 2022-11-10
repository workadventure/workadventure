import { parse } from "query-string";
import { HttpRequest } from "uWebSockets.js";
import App from "./server/app.js";
import SSLApp from "./server/sslapp.js";
import * as types from "./server/types.js";

const getQuery = (req: HttpRequest) => {
    return parse(req.getQuery());
};

export { App, SSLApp, getQuery };
export * from "./server/types.js";

export default {
    App,
    SSLApp,
    getQuery,
    ...types,
};
