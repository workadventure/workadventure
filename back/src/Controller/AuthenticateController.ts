import {URL_ROOM_STARTED} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import { uuid } from 'uuidv4';
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import {adminApi, AdminApiData} from "../Services/AdminApi";
import {jwtTokenManager} from "../Services/JWTTokenManager";

export interface TokenInterface {
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
                const host = req.getHeader('host');
                const param = await res.json();

                //todo: what to do if the organizationMemberToken is already used?
                const organizationMemberToken:string|null = param.organizationMemberToken;
                const mapSlug:string|null = param.mapSlug;

                try {
                    let userUuid;
                    let mapUrlStart;
                    let newUrl: string|null = null;

                    if (organizationMemberToken) {
                        const data = await adminApi.fetchMemberDataByToken(organizationMemberToken);

                        userUuid = data.userUuid;
                        mapUrlStart = data.mapUrlStart;
                        newUrl = this.getNewUrlOnAdminAuth(data)
                    } else if (mapSlug !== null) {
                        userUuid = uuid();
                        mapUrlStart = mapSlug;
                        newUrl = null;
                    } else {
                        userUuid = uuid();
                        mapUrlStart = host.replace('api.', 'maps.') + URL_ROOM_STARTED;
                        newUrl = '_/global/'+mapUrlStart;
                    }

                    const authToken = jwtTokenManager.createJWTToken(userUuid);
                    res.writeStatus("200 OK").end(JSON.stringify({
                        authToken,
                        userUuid,
                        mapUrlStart,
                        newUrl,
                    }));

                } catch (e) {
                    console.log("An error happened", e)
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
