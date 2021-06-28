import { Readable } from "stream";
import { us_listen_socket_close, TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";

import formData from "./formdata";
import { stob } from "./utils";
import { Handler } from "./types";
import { join } from "path";

const contTypes = ["application/x-www-form-urlencoded", "multipart/form-data"];
const noOp = () => true;

const handleBody = (res: HttpResponse, req: HttpRequest) => {
    const contType = req.getHeader("content-type");

    res.bodyStream = function () {
        const stream = new Readable();
        stream._read = noOp; // eslint-disable-line @typescript-eslint/unbound-method

        this.onData((ab: ArrayBuffer, isLast: boolean) => {
            // uint and then slicing is bit faster than slice and then uint
            stream.push(new Uint8Array(ab.slice((ab as any).byteOffset, ab.byteLength))); // eslint-disable-line @typescript-eslint/no-explicit-any
            if (isLast) {
                stream.push(null);
            }
        });

        return stream;
    };

    res.body = () => stob(res.bodyStream());

    if (contType.includes("application/json")) res.json = async () => JSON.parse(await res.body());
    if (contTypes.map((t) => contType.includes(t)).includes(true)) res.formData = formData.bind(res, contType);
};

class BaseApp {
    _sockets = new Map();
    ws!: TemplatedApp["ws"];
    get!: TemplatedApp["get"];
    _post!: TemplatedApp["post"];
    _put!: TemplatedApp["put"];
    _patch!: TemplatedApp["patch"];
    _listen!: TemplatedApp["listen"];

    post(pattern: string, handler: Handler) {
        if (typeof handler !== "function") throw Error(`handler should be a function, given ${typeof handler}.`);
        this._post(pattern, (res, req) => {
            handleBody(res, req);
            handler(res, req);
        });
        return this;
    }

    put(pattern: string, handler: Handler) {
        if (typeof handler !== "function") throw Error(`handler should be a function, given ${typeof handler}.`);
        this._put(pattern, (res, req) => {
            handleBody(res, req);

            handler(res, req);
        });
        return this;
    }

    patch(pattern: string, handler: Handler) {
        if (typeof handler !== "function") throw Error(`handler should be a function, given ${typeof handler}.`);
        this._patch(pattern, (res, req) => {
            handleBody(res, req);

            handler(res, req);
        });
        return this;
    }

    listen(h: string | number, p: Function | number = noOp, cb?: Function) {
        if (typeof p === "number" && typeof h === "string") {
            this._listen(h, p, (socket) => {
                this._sockets.set(p, socket);
                if (cb === undefined) {
                    throw new Error("cb undefined");
                }
                cb(socket);
            });
        } else if (typeof h === "number" && typeof p === "function") {
            this._listen(h, (socket) => {
                this._sockets.set(h, socket);
                p(socket);
            });
        } else {
            throw Error("Argument types: (host: string, port: number, cb?: Function) | (port: number, cb?: Function)");
        }

        return this;
    }

    close(port: null | number = null) {
        if (port) {
            this._sockets.has(port) && us_listen_socket_close(this._sockets.get(port));
            this._sockets.delete(port);
        } else {
            this._sockets.forEach((app) => {
                us_listen_socket_close(app);
            });
            this._sockets.clear();
        }
        return this;
    }
}

export default BaseApp;
