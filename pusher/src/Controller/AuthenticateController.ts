import { v4 } from "uuid";
import { HttpRequest, HttpResponse, TemplatedApp } from "uWebSockets.js";
import { BaseController } from "./BaseController";
import { adminApi } from "../Services/AdminApi";
import { jwtTokenManager } from "../Services/JWTTokenManager";
import { parse } from "query-string";
import { openIDClient } from "../Services/OpenIDClient";

export interface TokenInterface {
    userUuid: string;
}

export class AuthenticateController extends BaseController {
    constructor(private App: TemplatedApp) {
        super();
        this.openIDLogin();
        this.openIDCallback();
        this.register();
        this.anonymLogin();
    }

    openIDLogin() {
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.App.get("/login-screen", async (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("/message request was aborted");
            });

            const { nonce, state } = parse(req.getQuery());
            if (!state || !nonce) {
                res.writeStatus("400 Unauthorized").end("missing state and nonce URL parameters");
                return;
            }
            try {
                const loginUri = await openIDClient.authorizationUrl(state as string, nonce as string);
                res.writeStatus("302");
                res.writeHeader("Location", loginUri);
                return res.end();
            } catch (e) {
                return this.errorToResponse(e, res);
            }
        });
    }

    openIDCallback() {
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.App.get("/login-callback", async (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("/message request was aborted");
            });
            const { code, nonce } = parse(req.getQuery());
            try {
                const userInfo = await openIDClient.getUserInfo(code as string, nonce as string);
                const email = userInfo.email || userInfo.sub;
                if (!email) {
                    throw new Error("No email in the response");
                }
                const authToken = jwtTokenManager.createAuthToken(email);
                res.writeStatus("200");
                this.addCorsHeaders(res);
                return res.end(JSON.stringify({ authToken }));
            } catch (e) {
                return this.errorToResponse(e, res);
            }
        });
    }

    //Try to login with an admin token
    private register() {
        this.App.options("/register", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.post("/register", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                res.onAborted(() => {
                    console.warn("Login request was aborted");
                });
                const param = await res.json();

                //todo: what to do if the organizationMemberToken is already used?
                const organizationMemberToken: string | null = param.organizationMemberToken;

                try {
                    if (typeof organizationMemberToken != "string") throw new Error("No organization token");
                    const data = await adminApi.fetchMemberDataByToken(organizationMemberToken);
                    const userUuid = data.userUuid;
                    const email = data.email;
                    const roomUrl = data.roomUrl;
                    const mapUrlStart = data.mapUrlStart;
                    const textures = data.textures;

                    const authToken = jwtTokenManager.createAuthToken(email || userUuid);
                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    res.end(
                        JSON.stringify({
                            authToken,
                            userUuid,
                            roomUrl,
                            mapUrlStart,
                            organizationMemberToken,
                            textures,
                        })
                    );
                } catch (e) {
                    this.errorToResponse(e, res);
                }
            })();
        });
    }

    //permit to login on application. Return token to connect on Websocket IO.
    private anonymLogin() {
        this.App.options("/anonymLogin", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        this.App.post("/anonymLogin", (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("Login request was aborted");
            });

            const userUuid = v4();
            const authToken = jwtTokenManager.createAuthToken(userUuid);
            res.writeStatus("200 OK");
            this.addCorsHeaders(res);
            res.end(
                JSON.stringify({
                    authToken,
                    userUuid,
                })
            );
        });
    }
}
