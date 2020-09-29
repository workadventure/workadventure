import Jwt from "jsonwebtoken";
import {SECRET_KEY, URL_ROOM_STARTED} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import {OK} from "http-status-codes";
import {ADMIN_API_TOKEN, ADMIN_API_URL, SECRET_KEY, URL_ROOM_STARTED} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import { uuid } from 'uuidv4';
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import Axios from "axios";

export interface TokenInterface {
    userUuid: string
}

interface AdminApiData {
    organizationSlug: string
    worldSlug: string
    roomSlug: string
    mapUrlStart: string
    userUuid: string
}

export class AuthenticateController extends BaseController {

    constructor(private App : TemplatedApp) {
        super();
        this.login();
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

                //todo: what to do if the organizationMemberToken is already used?
                const organizationMemberToken:string|null = param.organizationMemberToken;

                try {
                    let userUuid;
                    let mapUrlStart;
                    let newUrl = null;

                    if (organizationMemberToken) {
                        if (!ADMIN_API_URL) {
                            return res.status(401).send('No admin backoffice set!');
                        }
                        //todo: this call can fail if the corresponding world is not activated or if the token is invalid. Handle that case.
                        const data = await Axios.get(ADMIN_API_URL+'/api/login-url/'+organizationMemberToken,
                            { headers: {"Authorization" : `${ADMIN_API_TOKEN}`} }
                        ).then((res): AdminApiData => res.data);

                        userUuid = data.userUuid;
                        mapUrlStart = data.mapUrlStart;
                        newUrl = this.getNewUrlOnAdminAuth(data)
                    } else {
                        userUuid = uuid();
                        mapUrlStart = req.getHeader('host').replace('api.', 'maps.') + URL_ROOM_STARTED;
                        newUrl = null;
                    }

                    const authToken = Jwt.sign({userUuid: userUuid}, SECRET_KEY, {expiresIn: '24h'});
                    res.writeStatus("200 OK").end(JSON.stringify({
                        authToken,
                        userUuid,
                        mapUrlStart,
                        newUrl,
                    }));

                } catch (e) {
                    console.log(e.message)
                    res.writeStatus(e.status || "500 Internal Server Error").end('An error happened');
                }


            })();
        });
    }

    private getNewUrlOnAdminAuth(data:AdminApiData): string {
        const organizationSlug = data.organizationSlug;
        const worldSlug = data.worldSlug;
        const roomSlug = data.roomSlug;
        return '/@/'+organizationSlug+'/'+worldSlug+'/'+roomSlug;
    }
}
