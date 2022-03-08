import { v4 } from "uuid";
import { BaseHttpController } from "./BaseHttpController";
import { adminApi, FetchMemberDataByUuidResponse } from "../Services/AdminApi";
import { AuthTokenData, jwtTokenManager } from "../Services/JWTTokenManager";
import { parse } from "query-string";
import { openIDClient } from "../Services/OpenIDClient";
import { DISABLE_ANONYMOUS } from "../Enum/EnvironmentVariable";
import { RegisterData } from "../Messages/JsonMessages/RegisterData";

export interface TokenInterface {
    userUuid: string;
}

export class AuthenticateController extends BaseHttpController {
    routes() {
        this.openIDLogin();
        this.openIDCallback();
        this.register();
        this.anonymLogin();
        this.profileCallback();
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
         *       200:
         *         description: TODO
         *
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
                        const resUserData = await this.getUserByUserIdentifier(
                            authTokenData.identifier,
                            playUri as string,
                            IPAddress
                        );

                        if (authTokenData.accessToken == undefined) {
                            //if not nonce and code, user connected in anonymous
                            //get data with identifier and return token
                            if (!code && !nonce) {
                                return res.json({ ...resUserData, authToken: token });
                            }
                            console.error("Token cannot to be check on OpenId provider");
                            res.status(500);
                            res.send("User cannot to be connected on openid provider");
                            return;
                        }

                        const resCheckTokenAuth = await openIDClient.checkTokenAuth(authTokenData.accessToken);
                        return res.json({ ...resCheckTokenAuth, ...resUserData, authToken: token });
                    } catch (err) {
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
                const authToken = jwtTokenManager.createAuthToken(email, userInfo?.access_token);

                //Get user data from Admin Back Office
                //This is very important to create User Local in LocalStorage in WorkAdventure
                const data = await this.getUserByUserIdentifier(email, playUri as string, IPAddress);

                return res.json({ ...data, authToken });
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
                    throw Error("Token cannot to be logout on Hydra");
                }
                await openIDClient.logoutUser(authTokenData.accessToken);
            } catch (error) {
                console.error("openIDCallback => logout-callback", error);
            }

            return res;
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

                try {
                    if (typeof organizationMemberToken != "string") throw new Error("No organization token");
                    const data = await adminApi.fetchMemberDataByToken(organizationMemberToken);
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
            const { token } = parse(req.path_query);
            try {
                //verify connected by token
                if (token != undefined) {
                    try {
                        const authTokenData: AuthTokenData = jwtTokenManager.verifyJWTToken(token as string, false);
                        if (authTokenData.accessToken == undefined) {
                            throw Error("Token cannot to be check on Hydra");
                        }
                        await openIDClient.checkTokenAuth(authTokenData.accessToken);

                        //get login profile
                        res.status(302);
                        res.setHeader("Location", adminApi.getProfileUrl(authTokenData.accessToken));
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
     *
     * @param email
     * @param playUri
     * @param IPAddress
     * @return FetchMemberDataByUuidResponse|object
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
        };
        try {
            data = await adminApi.fetchMemberDataByUuid(email, playUri, IPAddress, []);
        } catch (err) {
            console.error("openIDCallback => fetchMemberDataByUuid", err);
        }
        return data;
    }
}
