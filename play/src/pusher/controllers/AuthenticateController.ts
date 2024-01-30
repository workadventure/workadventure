import { v4 } from "uuid";
import { RegisterData, MeResponse, MeRequest } from "@workadventure/messages";
import { z } from "zod";
import * as Sentry from "@sentry/node";
import { JsonWebTokenError } from "jsonwebtoken";
import { AuthTokenData, jwtTokenManager } from "../services/JWTTokenManager";
import { openIDClient } from "../services/OpenIDClient";
import { DISABLE_ANONYMOUS, FRONT_URL } from "../enums/EnvironmentVariable";
import { adminService } from "../services/AdminService";
import { validateQuery } from "../services/QueryValidator";
import { VerifyDomainService } from "../services/verifyDomain/VerifyDomainService";
import { BaseHttpController } from "./BaseHttpController";

export class AuthenticateController extends BaseHttpController {
    routes(): void {
        this.openIDLogin();
        this.me();
        this.openIDCallback();
        this.logoutCallback();
        this.register();
        this.anonymLogin();
        this.profileCallback();
        this.logoutUser();
    }

    private openIDLogin(): void {
        /**
         * @openapi
         * /login-screen:
         *   get:
         *     description: Redirects the user to the OpenID login screen
         *     parameters:
         *      - name: "nonce"
         *        in: "query"
         *        description: "todo"
         *        required: true
         *        type: "string"
         *      - name: "state"
         *        in: "query"
         *        description: "todo"
         *        required: true
         *        type: "string"
         *      - name: "playUri"
         *        in: "query"
         *        description: "todo"
         *        required: false
         *        type: "string"
         *      - name: "redirect"
         *        in: "query"
         *        description: "todo"
         *        required: false
         *        type: "string"
         *     responses:
         *       302:
         *         description: Redirects the user to the OpenID login screen
         *
         */
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/login-screen", async (req, res) => {
            const query = validateQuery(
                req,
                res,
                z.object({
                    playUri: z.string(),
                    redirect: z.string().optional(),
                })
            );
            if (query === undefined) {
                return;
            }

            // Let's validate the playUri (we don't want a hacker to forge a URL that will redirect to a malicious URL)
            const verifyDomainService_ = VerifyDomainService.get(await adminService.getCapabilities());
            const verifyDomainResult = await verifyDomainService_.verifyDomain(query.playUri);
            if (!verifyDomainResult) {
                res.atomic(() => {
                    res.status(403);
                    res.send("Unauthorized domain in playUri");
                });
                return;
            }

            const loginUri = await openIDClient.authorizationUrl(res, query.redirect, query.playUri, req);
            res.atomic(() => {
                res.cookie("playUri", query.playUri, undefined, {
                    httpOnly: true, // dont let browser javascript access cookie ever
                    secure: req.secure, // only use cookie over https
                });

                res.redirect(loginUri);
            });
            return;
        });
    }

    private me(): void {
        /**
         * @openapi
         * /me:
         *   get:
         *     description: TODO
         *     parameters:
         *      - name: "code"
         *        in: "query"
         *        description: "todo"
         *        required: false
         *        type: "string"
         *      - name: "nonce"
         *        in: "query"
         *        description: "todo"
         *        required: false
         *        type: "string"
         *      - name: "token"
         *        in: "query"
         *        description: "todo"
         *        required: false
         *        type: "string"
         *      - name: "playUri"
         *        in: "query"
         *        description: "todo"
         *        required: true
         *        type: "string"
         *     responses:
         *       200:
         *         description: Response to the /me endpoint
         *         schema:
         *           $ref: '#/definitions/MeResponse'
         *       401:
         *         description: Thrown when the token is invalid
         */
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/me", async (req, res) => {
            const IPAddress = req.header("x-forwarded-for");
            const query = validateQuery(req, res, MeRequest);
            if (query === undefined) {
                return;
            }
            const { token, playUri, localStorageCompanionTextureId } = query;
            let localStorageCharacterTextureIds = query["localStorageCharacterTextureIds[]"];
            if (typeof localStorageCharacterTextureIds === "string") {
                localStorageCharacterTextureIds = [localStorageCharacterTextureIds];
            }
            try {
                const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token, false);

                //Get user data from Admin Back Office
                //This is very important to create User Local in LocalStorage in WorkAdventure
                const resUserData = await adminService.fetchMemberDataByUuid(
                    authTokenData.identifier,
                    authTokenData.accessToken,
                    playUri,
                    IPAddress,
                    localStorageCharacterTextureIds ?? [],
                    localStorageCompanionTextureId,
                    req.header("accept-language")
                );

                if (resUserData.status === "error") {
                    res.atomic(() => {
                        res.json(resUserData);
                    });
                    return;
                }

                if (authTokenData.accessToken == undefined) {
                    //if not nonce and code, anonymous user connected
                    //get data with identifier and return token
                    res.atomic(() => {
                        res.json({
                            authToken: token,
                            username: authTokenData?.username,
                            locale: authTokenData?.locale,
                            // TODO: replace ... with each property
                            ...resUserData,
                        } satisfies MeResponse);
                    });
                    return;
                }

                try {
                    const resCheckTokenAuth = await openIDClient.checkTokenAuth(authTokenData.accessToken);
                    res.atomic(() => {
                        res.json({
                            username: authTokenData?.username,
                            authToken: token,
                            locale: authTokenData?.locale,
                            // TODO: replace ... with each property
                            ...resUserData,
                            ...resCheckTokenAuth,
                        } satisfies MeResponse);
                    });
                } catch (err) {
                    console.warn("Error while checking token auth", err);
                    throw new JsonWebTokenError("Invalid token");
                }
                return;
            } catch (err) {
                if (err instanceof JsonWebTokenError) {
                    res.atomic(() => {
                        res.status(401);
                        res.send("Invalid token");
                    });
                    return;
                }

                /*if (isAxiosError(err)) {
                    const errorType = ErrorApiData.safeParse(err?.response?.data);
                    if (errorType.success) {
                        const status = err?.response?.status ?? 500;
                        res.atomic(() => {
                            res.sendStatus(status);
                            res.json(errorType.data);
                        });
                        return;
                    }
                }*/
                throw err;
            }
        });
    }

    private openIDCallback(): void {
        /**
         * @openapi
         * /openid-callback:
         *   get:
         *     description: This endpoint is meant to be called by the OpenID provider after the OpenID provider handles a login attempt. The OpenID provider redirects the browser to this endpoint.
         *     parameters:
         *      - name: "code"
         *        in: "query"
         *        description: "A unique code to be exchanged for an authentication token"
         *        required: false
         *        type: "string"
         *      - name: "nonce"
         *        in: "query"
         *        description: "todo"
         *        required: false
         *        type: "string"
         *     responses:
         *       302:
         *         description: Redirects to play once authentication is done, unless we use an AdminAPI (in this case, we redirect to the AdminAPI with same parameters)
         */
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/openid-callback", async (req, res) => {
            const playUri = req.cookies.playUri;
            if (!playUri) {
                throw new Error("Missing playUri in cookies");
            }
            //user have not token created, check data on hydra and create token
            let userInfo = null;
            try {
                userInfo = await openIDClient.getUserInfo(req, res);
            } catch (err) {
                //if no access on openid provider, return error
                Sentry.captureException("An error occurred while connecting to OpenID Provider => " + err);
                console.error("An error occurred while connecting to OpenID Provider => ", err);
                res.atomic(() => {
                    res.status(500);
                    res.send("An error occurred while connecting to OpenID Provider");
                });
                return;
            }
            const email = userInfo.email || userInfo.sub;
            if (!email) {
                throw new Error("No email in the response");
            }
            const authToken = jwtTokenManager.createAuthToken(
                email,
                userInfo?.access_token,
                userInfo?.username,
                userInfo?.locale
            );

            res.atomic(() => {
                res.clearCookie("playUri");
                // FIXME: possibly redirect to Admin instead.
                res.redirect(playUri + "?token=" + encodeURIComponent(authToken));
            });
            return;
        });
    }

    /**
     * @openapi
     * /register:
     *   post:
     *     description: Try to login with an admin token
     *     parameters:
     *      - name: "organizationMemberToken"
     *        in: "body"
     *        description: "A token allowing a user to connect to a given world"
     *        required: true
     *        type: "string"
     *     responses:
     *       200:
     *         description: The details of the logged user
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 authToken:
     *                   type: string
     *                   description: A unique identification JWT token
     *                 userUuid:
     *                   type: string
     *                   description: Unique user ID
     *                 email:
     *                   type: string|null
     *                   description: The email of the user
     *                   example: john.doe@example.com
     *                 roomUrl:
     *                   type: string
     *                   description: The room URL to connect to
     *                   example: https://play.workadventu.re/@/foo/bar/baz
     *                 organizationMemberToken:
     *                   type: string|null
     *                   description: TODO- unclear. It seems to be sent back from the request?
     *                   example: ???
     *                 mapUrlStart:
     *                   type: string
     *                   description: TODO- unclear. I cannot find any use of this
     *                   example: ???
     *                 messages:
     *                   type: array
     *                   description: The list of messages to be displayed when the user logs?
     *                   example: ???
     */
    private register(): void {
        this.app.options("/register", (req, res) => {
            res.atomic(() => {
                res.status(200).send("");
            });
        });

        this.app.post("/register", async (req, res) => {
            const param = await req.json();

            //todo: what to do if the organizationMemberToken is already used?
            const organizationMemberToken: string | null = param.organizationMemberToken;
            const playUri: string | null = param.playUri;

            if (typeof organizationMemberToken != "string") throw new Error("No organization token");
            const data = await adminService.fetchMemberDataByToken(
                organizationMemberToken,
                playUri,
                req.header("accept-language")
            );
            const userUuid = data.userUuid;
            const email = data.email;
            const roomUrl = data.roomUrl;
            const mapUrlStart = data.mapUrlStart;

            const authToken = jwtTokenManager.createAuthToken(email || userUuid);

            res.atomic(() => {
                res.json({
                    authToken,
                    userUuid,
                    email,
                    roomUrl,
                    mapUrlStart,
                    organizationMemberToken,
                } satisfies RegisterData);
            });
        });
    }

    /**
     * @openapi
     * /anonymLogin:
     *   post:
     *     description: Generates an "anonymous" JWT token allowing to connect to WorkAdventure anonymously.
     *     responses:
     *       200:
     *         description: The details of the logged user
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 authToken:
     *                   type: string
     *                   description: A unique identification JWT token
     *                 userUuid:
     *                   type: string
     *                   description: Unique user ID
     *       403:
     *         description: Anonymous login is disabled at the configuration level (environment variable DISABLE_ANONYMOUS = true)
     */
    private anonymLogin(): void {
        this.app.post("/anonymLogin", (req, res) => {
            if (DISABLE_ANONYMOUS) {
                res.atomic(() => {
                    res.status(403);
                });
                return;
            } else {
                const userUuid = v4();
                const authToken = jwtTokenManager.createAuthToken(userUuid);
                res.atomic(() => {
                    res.json({
                        authToken,
                        userUuid,
                    });
                });
                return;
            }
        });
    }

    /**
     * @openapi
     * /profile-callback:
     *   get:
     *     description: ???
     *     parameters:
     *      - name: "token"
     *        in: "query"
     *        description: "A JWT authentication token ???"
     *        required: true
     *        type: "string"
     *     responses:
     *       302:
     *         description: Redirects the user to the profile screen of the admin
     */
    private profileCallback(): void {
        this.app.get("/profile-callback", async (req, res) => {
            const query = validateQuery(
                req,
                res,
                z.object({
                    token: z.string(),
                    playUri: z.string(),
                })
            );
            if (query === undefined) {
                return;
            }
            const { token, playUri } = query;
            const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token, false);
            if (authTokenData.accessToken == undefined) {
                throw Error("Token cannot be checked on OpenID connect provider");
            }
            await openIDClient.checkTokenAuth(authTokenData.accessToken);

            const accessToken = authTokenData.accessToken;
            //get login profile
            res.atomic(() => {
                res.status(302);
                res.setHeader("Location", adminService.getProfileUrl(accessToken, playUri));
                res.send("");
            });
            return;
        });
    }

    private logoutCallback(): void {
        /**
         * @openapi
         * /logout-callback:
         *   get:
         *     description: TODO
         *     parameters:
         *      - name: "token"
         *        in: "query"
         *        description: "todo"
         *        required: false
         *        type: "string"
         *     responses:
         *       200:
         *         description: TODO
         *
         */
        this.app.get("/logout-callback", (req, res) => {
            // if no playUri, redirect to front
            if (!req.cookies.playUri) {
                res.atomic(() => {
                    res.redirect(FRONT_URL);
                });
                return;
            }

            // when user logout, redirect to playUri saved in cookie
            const logOutAdminUrl = new URL(req.cookies.playUri);
            res.atomic(() => {
                res.clearCookie("playUri");
                res.redirect(logOutAdminUrl.toString());
            });
            return;
        });
    }

    private logoutUser(): void {
        /**
         * @openapi
         * /logout:
         *   get:
         *     description: TODO
         *     responses:
         *       302:
         *         description: Redirects the user to the OpenID logout screen
         */
        this.app.get("/logout", async (req, res) => {
            const query = validateQuery(
                req,
                res,
                z.object({
                    playUri: z.string(),
                    token: z.string(),
                    redirect: z.string().optional(),
                })
            );
            if (query === undefined) {
                return;
            }

            const verifyDomainService_ = VerifyDomainService.get(await adminService.getCapabilities());
            const verifyDomainResult = await verifyDomainService_.verifyDomain(query.playUri);
            if (!verifyDomainResult) {
                res.atomic(() => {
                    res.status(403);
                    res.send("Unauthorized domain in playUri");
                });
                return;
            }

            const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(query.token, false);
            if (authTokenData.accessToken == undefined) {
                throw Error("Cannot log out, no access token found.");
            }
            // TODO: change that to use end session endpoint
            // Use post logout redirect and id token hint to redirect on the logut session endpoint of the OpenId provider
            // https://openid.net/specs/openid-connect-session-1_0.html#RPLogout
            await openIDClient.logoutUser(authTokenData.accessToken);

            res.atomic(() => {
                // if no redirect, redirect to playUri and connect user to the world
                // if the world is with authentication mandatory, the user will be redirected to the login screen
                // if the world is anonymous or with authentication optional, the user will be connected to the world
                if (!query.redirect) {
                    res.redirect(query.playUri);
                    return;
                }

                // save the playUri in cookie to redirect to the world after logout
                res.cookie("playUri", query.playUri, undefined, {
                    httpOnly: true, // dont let browser javascript access cookie ever
                    secure: req.secure, // only use cookie over https
                });
                res.redirect(query.redirect);
            });
        });
    }
}
