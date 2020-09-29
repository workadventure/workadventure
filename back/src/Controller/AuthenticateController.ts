import Jwt from "jsonwebtoken";
import {SECRET_KEY, URL_ROOM_STARTED} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import { uuid } from 'uuidv4';
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {BaseController} from "./BaseController";

export interface TokenInterface {
    name: string,
    userUuid: string
}

export class AuthenticateController extends BaseController {

    constructor(private App : TemplatedApp) {
        super();
        this.login();
    }

    onAbortedOrFinishedResponse(res: HttpResponse/*, readStream: any*/) {

        console.log("ERROR! onAbortedOrFinishedResponse called!");
        /*if (res.id == -1) {
            console.log("ERROR! onAbortedOrFinishedResponse called twice for the same res!");
        } else {
            console.log('Stream was closed, openStreams: ' + --openStreams);
            console.timeEnd(res.id);
            readStream.destroy();
        }*/

        /* Mark this response already accounted for */
        //res.id = -1;
    }

    //permit to login on application. Return token to connect on Websocket IO.
    login(){
        this.App.options("/login", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.post("/login", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                this.addCorsHeaders(res);

                res.onAborted(() => {
                    console.warn('Login request was aborted');
                })
                const param = await res.json();
                const userUuid = uuid();
                const token = Jwt.sign({name: param.name, userUuid: userUuid} as TokenInterface, SECRET_KEY, {expiresIn: '24h'});
                res.writeStatus("200 OK").end(JSON.stringify({
                    token: token,
                    mapUrlStart: URL_ROOM_STARTED,
                    userId: userUuid,
                }));
            })();
        });
    }
}
