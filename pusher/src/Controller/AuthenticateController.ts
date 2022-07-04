import { v4 } from "uuid";
import { BaseHttpController } from "./BaseHttpController";
import { FetchMemberDataByUuidResponse } from "../Services/AdminApi";
import { AuthTokenData, jwtTokenManager } from "../Services/JWTTokenManager";
import { parse } from "query-string";
import { openIDClient } from "../Services/OpenIDClient";
import { DISABLE_ANONYMOUS } from "../Enum/EnvironmentVariable";
import { RegisterData } from "../Messages/JsonMessages/RegisterData";
import { adminService } from "../Services/AdminService";
import Axios from "axios";
import { isErrorApiData } from "../Messages/JsonMessages/ErrorApiData";

export class AuthenticateController extends BaseHttpController {
    routes() {
        this.roomAccess();
        this.openIDLogin();
        this.openIDCallback();
        this.register();
        this.anonymLogin();
        this.profileCallback();
        this.me();
    }

    roomAccess() {
        this.app.get("/room/access", (req, res) => {
            (async () => {
                try {
                    const { uuid, playUri } = parse(req.path_query);
                    if (!uuid || !playUri) {
                        throw new Error("Missing uuid and playUri parameters.");
                    }
                    return res.json(
                        await adminService.fetchMemberDataByUuid(uuid as string, playUri as string, req.ip, [])
                    );
                } catch (e) {
                    console.warn(e);
                }
                res.status(500);
                res.send("User cannot be identified.");
                return;
            })().catch((e) => console.error(e));
        });
    }

    openIDLogin() {
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
            try {
                const { nonce, state, playUri, redirect } = parse(req.path_query);
                if (!state || !nonce) {
                    throw new Error("missing state and nonce URL parameters");
                }

                const loginUri = await openIDClient.authorizationUrl(
                    state as string,
                    nonce as string,
                    playUri as string | undefined,
                    redirect as string | undefined
                );
                res.status(302);
                res.setHeader("Location", loginUri);
                return res.send("");
            } catch (e) {
                console.error("openIDLogin => e", e);
                this.castErrorToResponse(e, res);
                return;
            }
        });
    }

    openIDCallback() {
        /**
         * @openapi
         * /login-callback:
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
        this.app.get("/login-callback", async (req, res) => {
            const IPAddress = req.header("x-forwarded-for");
            const { code, nonce, token, playUri } = parse(req.path_query);
            try {
                //verify connected by token
                if (token != undefined) {
                    try {
                        const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token as string, false);

                        //Get user data from Admin Back Office
                        //This is very important to create User Local in LocalStorage in WorkAdventure
                        const resUserData = await adminService.fetchMemberDataByUuid(
                            authTokenData.identifier,
                            playUri as string,
                            IPAddress,
                            [],
                            req.header("accept-language")
                        );

                        if (authTokenData.accessToken == undefined) {
                            //if not nonce and code, user connected in anonymous
                            //get data with identifier and return token
                            if (!code && !nonce) {
                                return res.json({ ...resUserData, authToken: token });
                            }
                            console.error("Token cannot be checked on OpenId provider");
                            res.status(500);
                            res.send("User cannot to be connected on openid provider");
                            return;
                        }

                        const resCheckTokenAuth = await openIDClient.checkTokenAuth(authTokenData.accessToken);
                        return res.json({
                            ...resCheckTokenAuth,
                            ...resUserData,
                            authToken: token,
                            username: authTokenData?.username,
                            locale: authTokenData?.locale,
                        });
                    } catch (err) {
                        if (Axios.isAxiosError(err)) {
                            const errorType = isErrorApiData.safeParse(err?.response?.data);
                            if (errorType.success) {
                                res.sendStatus(err?.response?.status ?? 500);
                                return res.json(errorType.data);
                            }
                        }
                        console.info("User was not connected", err);
                    }
                }

                //user have not token created, check data on hydra and create token
                let userInfo = null;
                try {
                    userInfo = await openIDClient.getUserInfo(code as string, nonce as string);
                } catch (err) {
                    //if no access on openid provider, return error
                    console.error("User cannot to be connected on OpenId provider => ", err);
                    res.status(500);
                    res.send("User cannot to be connected on openid provider");
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

                //Get user data from Admin Back Office
                //This is very important to create User Local in LocalStorage in WorkAdventure
                const data = await adminService.fetchMemberDataByUuid(
                    email,
                    playUri as string,
                    IPAddress,
                    [],
                    req.header("accept-language")
                );

                return res.json({ ...data, authToken, username: userInfo?.username, locale: userInfo?.locale });
            } catch (e) {
                console.error("openIDCallback => ERROR", e);
                return this.castErrorToResponse(e, res);
            }
        });

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
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/logout-callback", async (req, res) => {
            const { token } = parse(req.path_query);

            try {
                const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token as string, false);
                if (authTokenData.accessToken == undefined) {
                    throw Error("Token cannot be logout on Hydra");
                }
                await openIDClient.logoutUser(authTokenData.accessToken);
            } catch (error) {
                console.error("openIDCallback => logout-callback", error);
            }

            return res.status(200).send("");
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
    private register() {
        this.app.options("/register", {}, (req, res) => {
            res.status(200).send("");
        });
        this.app.post("/register", (req, res) => {
            (async () => {
                const param = await req.json();

                //todo: what to do if the organizationMemberToken is already used?
                const organizationMemberToken: string | null = param.organizationMemberToken;
                const playUri: string | null = param.playUri;

                try {
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
                } catch (e) {
                    console.error("register => ERROR", e);
                    this.castErrorToResponse(e, res);
                }
            })();
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
    private anonymLogin() {
        this.app.post("/anonymLogin", (req, res) => {
            if (DISABLE_ANONYMOUS) {
                res.status(403);
                return res;
            } else {
                const userUuid = v4();
                const authToken = jwtTokenManager.createAuthToken(userUuid);
                return res.json({
                    authToken,
                    userUuid,
                });
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
    profileCallback() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/profile-callback", async (req, res) => {
            const { token, playUri } = parse(req.path_query);
            try {
                //verify connected by token
                if (token != undefined) {
                    try {
                        const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token as string, false);
                        if (authTokenData.accessToken == undefined) {
                            throw Error("Token cannot be checked on OpenID connect provider");
                        }
                        await openIDClient.checkTokenAuth(authTokenData.accessToken);

                        //get login profile
                        res.status(302);
                        res.setHeader(
                            "Location",
                            adminService.getProfileUrl(authTokenData.accessToken, playUri as string)
                        );
                        res.send("");
                        return;
                    } catch (error) {
                        this.castErrorToResponse(error, res);
                        return;
                    }
                }
            } catch (error) {
                console.error("profileCallback => ERROR", error);
                this.castErrorToResponse(error, res);
            }
        });
    }

    /**
     * @openapi
     * /me:
     *   get:
     *     description: ???
     *     parameters:
     *      - name: "token"
     *        in: "query"
     *        description: "A JWT authentication token ???"
     *        required: true
     *        type: "string"
     *     responses:
     *       200:
     *         description: Data of user connected
     */
    me() {
        // @ts-ignore
        this.app.get("/me", async (req, res): void => {
            const { token } = parse(req.path_query);
            try {
                //verify connected by token
                if (token != undefined) {
                    try {
                        const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token as string, false);
                        if (authTokenData.accessToken == undefined) {
                            throw Error("Token cannot to be checked on Hydra");
                        }
                        const me = await openIDClient.checkTokenAuth(authTokenData.accessToken);

                        //get login profile
                        res.status(200);
                        res.json({ ...me });
                        return;
                    } catch (error) {
                        this.castErrorToResponse(error, res);
                        return;
                    }
                }
            } catch (error) {
                console.error("me => ERROR", error);
                this.castErrorToResponse(error, res);
                return;
            }
        });
    }

    /**
     *
     * @param email
     * @param playUri
     * @param IPAddress
     * @return
     |object
     * @private
     */
    private async getUserByUserIdentifier(
        email: string,
        playUri: string,
        IPAddress: string
    ): Promise<FetchMemberDataByUuidResponse | object> {
        let data: FetchMemberDataByUuidResponse = {
            email: email,
            userUuid: email,
            tags: [],
            messages: [],
            visitCardUrl: null,
            textures: [],
            userRoomToken: undefined,
            jabberId: null,
            jabberPassword: null,
            mucRooms: [],
            activatedInviteUser: true,
        };
        try {
            data = await adminService.fetchMemberDataByUuid(email, playUri, IPAddress, []);
        } catch (err) {
            console.error("openIDCallback => fetchMemberDataByUuid", err);
        }
        return data;
    }
}
