import { v4 } from 'uuid';
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import {adminApi} from "../Services/AdminApi";
import {jwtTokenManager} from "../Services/JWTTokenManager";

export interface TokenInterface {
    userUuid: string
}

export class AuthenticateController extends BaseController {

    constructor(private App : TemplatedApp) {
        super();
        this.register();
        this.anonymLogin();
    }

    //Try to login with an admin token
    register(){
        this.App.options("/register", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.post("/register", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                this.addCorsHeaders(res);

                res.onAborted(() => {
                    console.warn('Login request was aborted');
                })
                const host = req.getHeader('host');
                const param = await res.json();

                //todo: what to do if the organizationMemberToken is already used?
                const organizationMemberToken:string|null = param.organizationMemberToken;
                
                try {
                    if (typeof organizationMemberToken != 'string') throw new Error('No organization token');
                    const data = await adminApi.fetchMemberDataByToken(organizationMemberToken);
                    const userUuid = data.userUuid;
                    const organizationSlug = data.organizationSlug;
                    const worldSlug = data.worldSlug;
                    const roomSlug = data.roomSlug;
                    const mapUrlStart = data.mapUrlStart;

                    const authToken = jwtTokenManager.createJWTToken(userUuid);
                    res.writeStatus("200 OK").end(JSON.stringify({
                        authToken,
                        userUuid,
                        organizationSlug,
                        worldSlug,
                        roomSlug,
                        mapUrlStart,
                    }));

                } catch (e) {
                    console.error("An error happened", e)
                    res.writeStatus(e.status || "500 Internal Server Error").end('An error happened');
                }


            })();
        });

    }

    //permit to login on application. Return token to connect on Websocket IO.
    anonymLogin(){
        this.App.options("/anonymLogin", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.post("/anonymLogin", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.onAborted(() => {
                console.warn('Login request was aborted');
            })

            const userUuid = v4();
            const authToken = jwtTokenManager.createJWTToken(userUuid);
            res.writeStatus("200 OK").end(JSON.stringify({
                authToken,
                userUuid,
            }));
        });
    }
}
