import { v4 } from "uuid";
import { HttpRequest, HttpResponse, TemplatedApp } from "uWebSockets.js";
import { BaseController } from "./BaseController";
import { adminApi } from "../Services/AdminApi";
import { AuthTokenData, jwtTokenManager } from "../Services/JWTTokenManager";
import { parse } from "query-string";
import { openIDClient } from "../Services/OpenIDClient";
import { samlClient } from "../Services/SamlClient";

export interface TokenInterface {
    userUuid: string;
}

const connexionOauth = "oauth";
const connexionSAml = "saml";

export class AuthenticateController extends BaseController {
    constructor(private App: TemplatedApp) {
        super();
        this.openIDLogin();
        this.openIDCallback();
        this.register();
        this.anonymLogin();
        this.profileCallback();
    }

    private openIDLogin() {
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

    private openIDCallback() {
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.App.get("/login-callback", async (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("/message request was aborted");
            });
            const { code, nonce, type, token } = parse(req.getQuery());
            let authToken = null;

            try {
                //verify connected by token
                if (type != undefined && type === connexionOauth) {
                    if (token != undefined) {
                        try {
                            const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token as string, false);
                            if (authTokenData.hydraAccessToken == undefined) {
                                throw Error("Token cannot to be check on Hydra");
                            }
                            await openIDClient.checkTokenAuth(authTokenData.hydraAccessToken);
                            res.writeStatus("200");
                            this.addCorsHeaders(res);
                            return res.end(JSON.stringify({ authToken: token }));
                        } catch (err) {
                            console.info("User was not connected", err);
                        }
                    }

                    //user have not token created, check data on hydra and create token
                    const userInfo = await openIDClient.getUserInfo(code as string, nonce as string);
                    const email = userInfo.email || userInfo.sub;
                    if (!email) {
                        throw new Error("No email in the response");
                    }
                    authToken = jwtTokenManager.createAuthToken(email, userInfo.access_token);
                }

                if (type != undefined && type === connexionSAml) {
                    if (token != undefined) {
                        try {
                            const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token as string, false);
                            if (authTokenData.samlAccessUserId == undefined) {
                                throw Error("Token cannot to be check on Hydra");
                            }
                            const data = (await samlClient.checkTokenAuth(authTokenData.samlAccessUserId)) as {
                                email: string;
                                samlAccessUserId: string;
                            };
                            authToken = jwtTokenManager.createAuthToken(data.email, data.samlAccessUserId);
                        } catch (err) {
                            //if user is not connected on SSO, throw error
                            throw new Error("User was not connected");
                        }
                    }

                    const userInfo = (await samlClient.getUserInfo(code as string)) as {
                        email: string;
                        samlAccessUserId: string;
                    };
                    const email = userInfo.email;
                    if (!email) {
                        throw new Error("No email in the response");
                    }
                    authToken = jwtTokenManager.createAuthToken(email, userInfo.samlAccessUserId);
                }

                if (authToken === null) {
                    throw "No connexion type detected";
                }

                res.writeStatus("200");
                this.addCorsHeaders(res);
                return res.end(JSON.stringify({ authToken }));
            } catch (e) {
                return this.errorToResponse(e, res);
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.App.get("/logout-callback", async (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("/message request was aborted");
            });

            const { token } = parse(req.getQuery());

            try {
                const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token as string, false);
                if (authTokenData.hydraAccessToken == undefined) {
                    throw Error("Token cannot to be logout on Hydra");
                }
                await openIDClient.logoutUser(authTokenData.hydraAccessToken);
            } catch (error) {
                console.error("openIDCallback => logout-callback", error);
            } finally {
                res.writeStatus("200");
                this.addCorsHeaders(res);
                // eslint-disable-next-line no-unsafe-finally
                return res.end();
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

    private profileCallback() {
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.App.get("/profile-callback", async (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("/message request was aborted");
            });
            const { userIdentify, token } = parse(req.getQuery());
            try {
                //verify connected by token
                if (token != undefined) {
                    try {
                        const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token as string, false);
                        if (authTokenData.hydraAccessToken == undefined) {
                            throw Error("Token cannot to be check on Hydra");
                        }
                        await openIDClient.checkTokenAuth(authTokenData.hydraAccessToken);

                        //get login profile
                        res.writeStatus("302");
                        res.writeHeader("Location", adminApi.getProfileUrl(authTokenData.hydraAccessToken));
                        this.addCorsHeaders(res);
                        // eslint-disable-next-line no-unsafe-finally
                        return res.end();
                    } catch (error) {
                        return this.errorToResponse(error, res);
                    }
                }
            } catch (error) {
                this.errorToResponse(error, res);
            }
        });
    }

    private loginSso() {
        this.App.get("/login-sso", async (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("/message request was aborted");
            });

            const param = await res.json();

            try {
                const organizationMemberToken: string | null = param.organizationMemberToken;
                if (typeof organizationMemberToken != "string") throw new Error("No organization token");
                const data = await adminApi.fetchMemberDataByToken(organizationMemberToken);
                const email = data.email;
                const userUuid = data.userUuid;

                const authToken = jwtTokenManager.createAuthToken(email || userUuid, undefined, "1d");

                res.writeStatus("200");
                this.addCorsHeaders(res);
                return res.end(JSON.stringify({ authToken }));
            } catch (e) {
                return this.errorToResponse(e, res);
            }
        });
    }
}
