import fs from "fs";
import { v4 } from "uuid";
import type { MeResponse, RegisterData } from "@workadventure/messages";
import { MeRequest } from "@workadventure/messages";
import { z } from "zod";
import { errors } from "jose";
import Mustache from "mustache";
import type { Application } from "express";
import Debug from "debug";
import type { AuthTokenData } from "../services/JWTTokenManager";
import { jwtTokenManager } from "../services/JWTTokenManager";
import { openIDClient } from "../services/OpenIDClient";
import { DISABLE_ANONYMOUS, FRONT_URL, MATRIX_PUBLIC_URI, PUSHER_URL } from "../enums/EnvironmentVariable";
import { adminService } from "../services/AdminService";
import { validateQuery } from "../services/QueryValidator";
import { VerifyDomainService } from "../services/verifyDomain/VerifyDomainService";
import { matrixProvider } from "../services/MatrixProvider";
import { getClientIpFromXForwardedFor } from "../services/ClientIp";
import { BaseHttpController } from "./BaseHttpController";

const debug = Debug("pusher:requests");

export class AuthenticateController extends BaseHttpController {
    private readonly redirectToMatrixFile: string;
    private readonly redirectToPlayFile: string;
    constructor(app: Application) {
        super(app);

        let redirectToMatrixPath: string;
        if (fs.existsSync("dist/public/redirectToMatrix.html")) {
            redirectToMatrixPath = "dist/public/redirectToMatrix.html";
        } else if (fs.existsSync("redirectToMatrix.html")) {
            redirectToMatrixPath = "redirectToMatrix.html";
        } else {
            throw new Error("Could not find redirectToMatrix.html file");
        }

        this.redirectToMatrixFile = fs.readFileSync(redirectToMatrixPath, "utf8");
        Mustache.parse(this.redirectToMatrixFile);

        let redirectToPlayPath: string;
        if (fs.existsSync("dist/public/redirectToPlay.html")) {
            redirectToPlayPath = "dist/public/redirectToPlay.html";
        } else if (fs.existsSync("redirectToPlay.html")) {
            redirectToPlayPath = "redirectToPlay.html";
        } else {
            throw new Error("Could not find redirectToPlay.html file");
        }

        this.redirectToPlayFile = fs.readFileSync(redirectToPlayPath, "utf8");
        Mustache.parse(this.redirectToPlayFile);
    }

    routes(): void {
        this.openIDLogin();
        this.me();
        this.openIDCallback();
        this.matrixCallback();
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
         *     responses:
         *       302:
         *         description: Redirects the user to the OpenID login screen
         *
         */
        this.app.get("/login-screen", async (req, res) => {
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const query = validateQuery(
                req,
                res,
                z.object({
                    playUri: z.string(),
                    manuallyTriggered: z.literal("true").optional(),
                    chatRoomId: z.string().optional(),
                    providerId: z.string().optional(),
                    providerScopes: z.string().array().optional(),
                })
            );
            if (query === undefined) {
                return;
            }

            const verifyDomainService_ = VerifyDomainService.get(await adminService.getCapabilities());
            const verifyDomainResult = await verifyDomainService_.verifyDomain(query.playUri);
            if (!verifyDomainResult) {
                res.status(403);
                res.send("Unauthorized domain in playUri");
                return;
            }

            const loginUri = await openIDClient.authorizationUrl(
                res,
                query.playUri,
                req,
                query.manuallyTriggered,
                query.chatRoomId,
                query.providerId,
                query.providerScopes
            );
            res.cookie("playUri", query.playUri, {
                httpOnly: true,
                secure: req.secure,
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
         *         description: Response to the /me endpoint
         *         schema:
         *           $ref: '#/definitions/MeResponse'
         *       401:
         *         description: Thrown when the token is invalid
         */
        this.app.get("/me", async (req, res) => {
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const IPAddress = getClientIpFromXForwardedFor(req.header("x-forwarded-for"));
            const query = validateQuery(req, res, MeRequest);
            if (query === undefined) {
                return;
            }
            const { token, playUri, localStorageCompanionTextureId, chatID } = query;
            let localStorageCharacterTextureIds = query["localStorageCharacterTextureIds[]"];
            if (typeof localStorageCharacterTextureIds === "string") {
                localStorageCharacterTextureIds = [localStorageCharacterTextureIds];
            }
            try {
                const authTokenData: AuthTokenData = await jwtTokenManager.verifyJWTToken(token, false);

                const resUserData = await adminService.fetchMemberDataByUuid(
                    authTokenData.identifier,
                    authTokenData.accessToken,
                    playUri,
                    IPAddress,
                    localStorageCharacterTextureIds ?? [],
                    localStorageCompanionTextureId,
                    req.header("accept-language"),
                    authTokenData.tags,
                    chatID
                );

                if (resUserData.status === "error") {
                    res.json(resUserData);
                    return;
                }

                if (authTokenData.accessToken == undefined) {
                    res.json({
                        authToken: token,
                        username: authTokenData?.username,
                        locale: authTokenData?.locale,
                        ...resUserData,
                        matrixUserId: authTokenData?.matrixUserId,
                        matrixServerUrl: MATRIX_PUBLIC_URI,
                    } satisfies MeResponse);
                    return;
                }

                try {
                    const resCheckTokenAuth = await openIDClient.checkTokenAuth(authTokenData.accessToken);
                    res.json({
                        username: authTokenData?.username,
                        authToken: token,
                        locale: authTokenData?.locale,
                        matrixUserId: authTokenData?.matrixUserId,
                        matrixServerUrl: (resCheckTokenAuth.matrix_url as string | undefined) ?? MATRIX_PUBLIC_URI,
                        ...resUserData,
                        ...resCheckTokenAuth,
                    } satisfies MeResponse);
                } catch (err) {
                    // OIDC access token expired — attempt silent refresh before forcing re-login
                    if (authTokenData.refreshToken) {
                        try {
                            const refreshed = await openIDClient.refreshAccessToken(authTokenData.refreshToken);
                            const resCheckTokenAuth = await openIDClient.checkTokenAuth(refreshed.access_token);
                            const newAuthToken = await jwtTokenManager.createAuthToken(
                                authTokenData.identifier,
                                refreshed.access_token,
                                refreshed.refresh_token ?? authTokenData.refreshToken,
                                authTokenData.username,
                                authTokenData.locale,
                                authTokenData.tags,
                                authTokenData.matrixUserId
                            );
                            res.json({
                                username: authTokenData?.username,
                                authToken: newAuthToken,
                                locale: authTokenData?.locale,
                                matrixUserId: authTokenData?.matrixUserId,
                                matrixServerUrl:
                                    (resCheckTokenAuth.matrix_url as string | undefined) ?? MATRIX_PUBLIC_URI,
                                ...resUserData,
                                ...resCheckTokenAuth,
                            } satisfies MeResponse);
                            return;
                        } catch (refreshErr) {
                            console.warn("OIDC silent refresh failed, forcing re-login", refreshErr);
                        }
                    }
                    console.warn("Error while checking token auth", err);
                    throw new errors.JWTInvalid("Invalid token");
                }
                return;
            } catch (err) {
                if (err instanceof errors.JWTInvalid || err instanceof errors.JWTExpired) {
                    res.status(401);
                    res.send("Invalid token");
                    return;
                }
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
        this.app.get("/openid-callback", async (req, res) => {
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const playUri = req.cookies.playUri;
            if (!playUri) {
                throw new Error("Missing playUri in cookies");
            }

            let userInfo = null;
            try {
                userInfo = await openIDClient.getUserInfo(req, res, playUri);
            } catch (err) {
                console.error("An error occurred while connecting to OpenID Provider => ", err);
                res.status(500);
                res.send("An error occurred while connecting to OpenID Provider");
                return;
            }
            const email = userInfo.email || userInfo.sub;
            if (!email) {
                throw new Error("No email in the response");
            }
            const authToken = await jwtTokenManager.createAuthToken(
                email,
                userInfo?.access_token,
                userInfo?.refresh_token,
                userInfo?.username,
                userInfo?.locale,
                userInfo?.tags,
                email ? matrixProvider.getBareMatrixIdFromEmail(email) : undefined
            );

            const matrixPublicUri = userInfo.matrix_url ?? MATRIX_PUBLIC_URI;

            if (matrixPublicUri) {
                const matrixCallbackUrl = new URL("/matrix-callback", PUSHER_URL).toString();
                let redirectPath = "/_matrix/client/v3/login/sso/redirect";
                if (userInfo.matrix_identity_provider) {
                    redirectPath += "/" + userInfo.matrix_identity_provider;
                }
                const matrixRedirectUrl = new URL(redirectPath, matrixPublicUri);
                matrixRedirectUrl.searchParams.append("redirectUrl", matrixCallbackUrl);

                const html = Mustache.render(this.redirectToMatrixFile, {
                    authToken,
                    matrixRedirectUrl: matrixRedirectUrl.toString(),
                });

                res.type("html").send(html);
                return;
            }

            res.clearCookie("playUri");
            res.redirect(playUri + "?token=" + encodeURIComponent(authToken));
            return;
        });
    }

    private matrixCallback(): void {
        /**
         * @openapi
         * /matrix-callback:
         *   get:
         *     description: This endpoint is meant to be called by the Matrix server (Synapse) after the OpenID provider connected to Synapse handles a login attempt. Synapse redirects the browser to this endpoint.
         *     parameters:
         *      - name: "loginToken"
         *        in: "query"
         *        description: "A unique token that can be exchanged for a Matrix authentication token"
         *        required: true
         *        type: "string"
         *     responses:
         *       302:
         *         description: Redirects to play once authentication is done.
         */
        this.app.get("/matrix-callback", (req, res) => {
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const playUri = req.cookies.playUri;
            if (!playUri) {
                throw new Error("Missing playUri in cookies");
            }

            const query = validateQuery(
                req,
                res,
                z.object({ loginToken: z.string(), chatRoomId: z.string().optional() })
            );
            if (query === undefined) {
                return;
            }

            res.clearCookie("playUri");
            res.clearCookie("authToken");
            const playUriUrl = new URL(req.cookies.playUri);
            playUriUrl.searchParams.append("matrixLoginToken", query.loginToken);

            if (query.chatRoomId) {
                playUriUrl.searchParams.append("chatRoomId", query.chatRoomId);
            }

            const html = Mustache.render(this.redirectToPlayFile, {
                playUri: playUriUrl.toString(),
            });
            res.type("html").send(html);
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
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const param = req.body;

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
            const matrixUserId = email ? matrixProvider.getBareMatrixIdFromEmail(email) : undefined;

            const authToken = await jwtTokenManager.createAuthToken(
                email || userUuid,
                undefined,
                undefined,
                undefined,
                undefined,
                [],
                matrixUserId
            );

            res.json({
                authToken,
                userUuid,
                email,
                roomUrl,
                mapUrlStart,
                organizationMemberToken,
            } satisfies RegisterData);
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
        this.app.post("/anonymLogin", async (req, res) => {
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            if (DISABLE_ANONYMOUS) {
                res.status(403).send("");
                return;
            } else {
                const userUuid = v4();
                const authToken = await jwtTokenManager.createAuthToken(userUuid);
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
     *      - name: "playUri"
     *        in: "query"
     *        description: "Room URL of the current virtual place"
     *        required: true
     *        type: "string"
     *     responses:
     *       302:
     *         description: Redirects the user to the profile screen of the admin
     */
    private profileCallback(): void {
        this.app.get("/profile-callback", async (req, res) => {
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
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
            const authTokenData: AuthTokenData = await jwtTokenManager.verifyJWTToken(token, false);
            if (authTokenData.accessToken == undefined) {
                throw Error("Token cannot be checked on OpenID connect provider");
            }
            await openIDClient.checkTokenAuth(authTokenData.accessToken);

            const accessToken = authTokenData.accessToken;
            res.status(302);
            res.setHeader("Location", adminService.getProfileUrl(accessToken, playUri));
            res.send("");
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
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            if (!req.cookies.playUri) {
                res.redirect(FRONT_URL);
                return;
            }

            const logOutAdminUrl = new URL(req.cookies.playUri);
            res.clearCookie("playUri");
            res.redirect(logOutAdminUrl.toString());
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
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
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
                res.status(403);
                res.send("Unauthorized domain in playUri");
                return;
            }

            const authTokenData: AuthTokenData = await jwtTokenManager.verifyJWTToken(query.token, false);
            if (authTokenData.accessToken == undefined) {
                throw Error("Cannot log out, no access token found.");
            }
            await openIDClient.logoutUser(authTokenData.accessToken);

            if (!query.redirect) {
                res.redirect(query.playUri);
                return;
            }

            res.cookie("playUri", query.playUri, {
                httpOnly: true,
                secure: req.secure,
            });
            res.redirect(query.redirect);
        });
    }
}
