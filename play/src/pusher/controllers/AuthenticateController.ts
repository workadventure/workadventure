import { v4 } from "uuid";
import { BaseHttpController } from "./BaseHttpController";
import type { AuthTokenData } from "../services/JWTTokenManager";
import { jwtTokenManager } from "../services/JWTTokenManager";
import { openIDClient } from "../services/OpenIDClient";
import { DISABLE_ANONYMOUS } from "../enums/EnvironmentVariable";
import { isErrorApiData } from "@workadventure/messages";
import type { RegisterData } from "@workadventure/messages";
import { adminService } from "../services/AdminService";
import Axios from "axios";
import { z } from "zod";
import { validateQuery } from "../services/QueryValidator";
import { VerifyDomainService } from "../services/verifyDomain/VerifyDomainService";
import { adminApi } from "../services/AdminApi";

export class AuthenticateController extends BaseHttpController {
    routes(): void {
        this.roomAccess();
        this.openIDLogin();
        this.me();
        this.openIDCallback();
        this.logoutCallback();
        this.register();
        this.anonymLogin();
        this.profileCallback();
    }

    private roomAccess(): void {
        this.app.get("/room/access", async (req, res) => {
            try {
                const query = validateQuery(
                    req,
                    res,
                    z.object({
                        uuid: z.string(),
                        playUri: z.string(),
                        token: z.string().optional(),
                    })
                );
                if (query === undefined) {
                    return;
                }

                const { uuid, playUri, token } = query;

                res.json(await adminService.fetchMemberDataByUuid(uuid, token, playUri, req.ip, []));
                return;
            } catch (e) {
                console.warn(e);
            }
            res.status(500);
            res.send("User cannot be identified.");
            return;
        });
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
            const verifyDomainService = VerifyDomainService.get(adminApi.getCapabilities());
            const verifyDomainResult = await verifyDomainService.verifyDomain(query.playUri);
            if (!verifyDomainResult) {
                res.status(403);
                res.send("Unauthorized domain in playUri");
                return;
            }

            const loginUri = await openIDClient.authorizationUrl(res, query.redirect, query.playUri);
            res.cookie("playUri", query.playUri, undefined, {
                httpOnly: true,
            });

            res.redirect(loginUri);
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
         *         description: NOTE - THERE ARE ADDITIONAL PROPERTIES NOT DISPLAYED HERE. THEY COME FROM THE CALL TO openIDClient.checkTokenAuth
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 authToken:
         *                   type: string
         *                   description: A new JWT token (if no token was passed in parameter), or returns the token that was passed in parameter if one was supplied
         *                 username:
         *                   type: string|undefined
         *                   description: Contains the username stored in the JWT token passed in parameter. If no token was passed, contains the data from OpenID.
         *                   example: John Doe
         *                 locale:
         *                   type: string|undefined
         *                   description: Contains the locale stored in the JWT token passed in parameter. If no token was passed, contains the data from OpenID.
         *                   example: fr_FR
         *                 email:
         *                   type: string
         *                   description: TODO
         *                   example: TODO
         *                 userUuid:
         *                   type: string
         *                   description: TODO
         *                   example: TODO
         *                 visitCardUrl:
         *                   type: string|null
         *                   description: TODO
         *                   example: TODO
         *                 tags:
         *                   type: array
         *                   description: The list of tags of the user
         *                   items:
         *                     type: string
         *                     example: speaker
         *                 textures:
         *                   type: array
         *                   description: The list of textures of the user
         *                   items:
         *                     type: TODO
         *                     example: TODO
         *                 messages:
         *                   type: array
         *                   description: The list of messages to be displayed to the user
         *                   items:
         *                     type: TODO
         *                     example: TODO
         */
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/me", async (req, res) => {
            const IPAddress = req.header("x-forwarded-for");
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
            try {
                const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token, false);

                //Get user data from Admin Back Office
                //This is very important to create User Local in LocalStorage in WorkAdventure
                const resUserData = await adminService.fetchMemberDataByUuid(
                    authTokenData.identifier,
                    authTokenData.accessToken,
                    playUri,
                    IPAddress,
                    [],
                    req.header("accept-language")
                );

                if (authTokenData.accessToken == undefined) {
                    //if not nonce and code, anonymous user connected
                    //get data with identifier and return token
                    res.json({
                        authToken: token,
                        username: authTokenData?.username,
                        locale: authTokenData?.locale,
                        ...resUserData,
                    });
                    return;
                }

                const resCheckTokenAuth = await openIDClient.checkTokenAuth(authTokenData.accessToken);
                res.json({
                    username: authTokenData?.username,
                    authToken: token,
                    locale: authTokenData?.locale,
                    ...resUserData,
                    ...resCheckTokenAuth,
                });
                return;
            } catch (err) {
                if (Axios.isAxiosError(err)) {
                    const errorType = isErrorApiData.safeParse(err?.response?.data);
                    if (errorType.success) {
                        res.sendStatus(err?.response?.status ?? 500);
                        res.json(errorType.data);
                        return;
                    }
                }
                throw err;
            }
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
        this.app.get("/logout-callback", async (req, res) => {
            const query = validateQuery(
                req,
                res,
                z.object({
                    token: z.string(),
                })
            );
            if (query === undefined) {
                return;
            }

            try {
                const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(query.token, false);
                if (authTokenData.accessToken == undefined) {
                    throw Error("Cannot log out, no access token found.");
                }
                await openIDClient.logoutUser(authTokenData.accessToken);
            } catch (error) {
                console.error("openIDCallback => logout-callback", error);
            }

            res.status(200).send("");
            return;
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
            const playUri = (req.cookies as Record<string, string>).playUri;
            if (!playUri) {
                throw new Error("Missing playUri in cookies");
            }
            //user have not token created, check data on hydra and create token
            let userInfo = null;
            try {
                userInfo = await openIDClient.getUserInfo(req, res);
            } catch (err) {
                //if no access on openid provider, return error
                console.error("An error occurred while connecting to OpenID Provider => ", err);
                res.status(500);
                res.send("An error occurred while connecting to OpenID Provider");
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

            res.clearCookie("playUri");
            // FIXME: possibly redirect to Admin instead.
            res.redirect(playUri + "?token=" + encodeURIComponent(authToken));
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
            res.status(200).send("");
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

            res.json({
                authToken,
                userUuid,
                email,
                roomUrl,
                mapUrlStart,
                organizationMemberToken,
            } as RegisterData);
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
                res.status(403);
                return;
            } else {
                const userUuid = v4();
                const authToken = jwtTokenManager.createAuthToken(userUuid);
                res.json({
                    authToken,
                    userUuid,
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

            //get login profile
            res.status(302);
            res.setHeader("Location", adminService.getProfileUrl(authTokenData.accessToken, playUri));
            res.send("");
            return;
        });
    }
}
