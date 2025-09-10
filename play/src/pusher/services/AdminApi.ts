import type { AxiosResponse } from "axios";
import axios, { isAxiosError } from "axios";
import {
    AdminApiData,
    isOauthRefreshToken,
    MapDetailsData,
    OauthRefreshToken,
    RoomRedirect,
    MemberData,
    Capabilities,
    CompanionDetail,
    ErrorApiData,
    isAdminApiData,
    isApplicationDefinitionInterface,
    isCapabilities,
    isErrorApiErrorData,
    isMapDetailsData,
    isRoomRedirect,
    WokaDetail,
} from "@workadventure/messages";
import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";
import * as Sentry from "@sentry/node";
import { Deferred } from "ts-deferred";
import { JsonWebTokenError } from "jsonwebtoken";
import {
    ADMIN_API_RETRY_DELAY,
    ADMIN_API_TOKEN,
    ADMIN_API_URL,
    OPID_PROFILE_SCREEN_PROVIDER,
    ADMIN_URL,
} from "../enums/EnvironmentVariable";
import type { AdminInterface } from "./AdminInterface";
import type { AuthTokenData } from "./JWTTokenManager";
import { jwtTokenManager } from "./JWTTokenManager";
import { ShortMapDescriptionList } from "./ShortMapDescription";
import { WorldChatMembersData } from "./WorldChatMembersData";

export const AdminBannedData = z.object({
    is_banned: z.boolean(),
    message: z.string(),
});

export type AdminBannedData = z.infer<typeof AdminBannedData>;

export const isFetchMemberDataByUuidSuccessResponse = z.object({
    status: extendApi(z.literal("ok"), {
        description: "MUST be 'ok' if the system successfully authenticated the user.",
        example: "ok",
    }),
    email: extendApi(z.string().nullable(), {
        description: "The email of the fetched user, it can be an email, an uuid or null.",
        example: "example@workadventu.re",
    }),
    username: extendApi(z.string().nullable().optional(), {
        description: "The name of the fetched user.",
        example: "Greg",
    }),
    userUuid: extendApi(z.string(), {
        description: "The uuid of the fetched user, it can be an email, an uuid.",
        example: "998ce839-3dea-4698-8b41-ebbdf7688ad9",
    }),
    tags: extendApi(z.array(z.string()), {
        description: "List of tags related to the user fetched.",
        example: ["editor"],
    }),
    visitCardUrl: extendApi(z.string().nullable(), {
        description: "URL of the visitCard of the user fetched.",
        example: "https://mycompany.com/contact/me",
    }),
    isCharacterTexturesValid: extendApi(z.boolean(), {
        description:
            "True if the character textures are valid, false if we need to redirect the user to the Woka selection page.",
        example: true,
    }),
    characterTextures: extendApi(z.array(WokaDetail), {
        description:
            "This data represents the textures (WOKA) that will be available to users. If an empty array is returned, the user is redirected to the Woka selection page.",
    }),
    isCompanionTextureValid: extendApi(z.boolean(), {
        description:
            "True if the companion texture is valid, false if we need to redirect the user to the companion selection page.",
        example: true,
    }),
    companionTexture: extendApi(CompanionDetail.nullable().optional(), {
        description: "This data represents the companion texture that will be use.",
    }),
    messages: extendApi(z.array(z.unknown()), {
        description:
            "Sets messages that will be displayed when the user logs in to the WA room. These messages are used for ban or ban warning.",
    }),
    /*anonymous: extendApi(z.boolean().optional(), {
        description: "Defines whether it is possible to login as anonymous on a WorkAdventure room.",
        example: false,
    }),*/
    userRoomToken: extendApi(z.optional(z.string()), { description: "", example: "" }),
    activatedInviteUser: extendApi(z.boolean().nullable().optional(), {
        description: "Button invite is activated in the action bar",
    }),
    applications: extendApi(z.array(isApplicationDefinitionInterface).nullable().optional(), {
        description: "The applications run into the customer's world",
    }),
    canEdit: extendApi(z.boolean().nullable().optional(), {
        description: "True if the user can edit the map",
    }),
    world: extendApi(z.string(), {
        description: "name of the world",
    }),
    chatID: extendApi(z.string().optional(), {
        description: "ChatId of user",
    }),
});

export const isFetchWorldChatMembers = z.object({
    total: z.number().positive(),
    members: z.array(isFetchMemberDataByUuidSuccessResponse),
});
export type FetchMemberDataByUuidSuccessResponse = z.infer<typeof isFetchMemberDataByUuidSuccessResponse>;

export const isFetchMemberDataByUuidResponse = z.union([isFetchMemberDataByUuidSuccessResponse, ErrorApiData]);

export type FetchMemberDataByUuidResponse = z.infer<typeof isFetchMemberDataByUuidResponse>;

export type FetchWorldChatMembers = z.infer<typeof isFetchWorldChatMembers>;

class AdminApi implements AdminInterface {
    private capabilities: Capabilities = {};
    private capabilitiesDeferred = new Deferred<Capabilities>();

    /**
     * Checks whether admin api is enabled
     */
    isEnabled(): boolean {
        return !!ADMIN_API_URL;
    }

    async initialise(): Promise<Capabilities> {
        if (!this.isEnabled()) {
            console.info("Admin API not configured. Will use local implementations");
            return this.capabilities;
        }

        console.info(`Admin api is enabled at ${ADMIN_API_URL}. Will check connection and capabilities`);
        let warnIssued = false;
        const queryCapabilities = async (resolve: (_v: unknown) => void): Promise<void> => {
            try {
                this.capabilities = await this.fetchCapabilities();
                this.capabilitiesDeferred.resolve(this.capabilities);
                console.info(`Capabilities query successful. Found capabilities: ${JSON.stringify(this.capabilities)}`);
                resolve(0);
            } catch (ex) {
                // ignore errors when querying capabilities
                if (isAxiosError(ex) && ex.response?.status === 404) {
                    // 404 probably means an older api version

                    this.capabilities = {
                        "api/woka/list": "v1",
                    };
                    this.capabilitiesDeferred.resolve(this.capabilities);

                    resolve(0);
                    console.warn(`Admin API server does not implement capabilities, default to basic capabilities`);
                    return;
                }

                // if we get here, it might be due to connectivity issues
                if (!warnIssued)
                    console.warn(
                        `Could not reach Admin API server at ${ADMIN_API_URL}, will retry in ${ADMIN_API_RETRY_DELAY} ms`,
                        ex
                    );

                warnIssued = true;

                setTimeout(() => {
                    queryCapabilities(resolve).catch((e) => console.error(e));
                }, ADMIN_API_RETRY_DELAY);
            }
        };
        await new Promise((resolve) => {
            queryCapabilities(resolve).catch((e) => console.error(e));
        });
        console.info(`Remote admin api connection successful at ${ADMIN_API_URL}`);
        return this.capabilities;
    }

    private async fetchCapabilities(): Promise<Capabilities> {
        /**
         * @openapi
         * /api/capabilities:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Get admin api capabilties
         *     produces:
         *      - "application/json"
         *     responses:
         *       200:
         *         description: a map of capabilities and versions
         *         schema:
         *             type: object
         *             items:
         *                 $ref: '#/definitions/Capabilities'
         *       404:
         *         description: Endpoint not found. If the admin api does not implement, will use default capabilities
         */
        const res = await axios.get<unknown, AxiosResponse<string[]>>(ADMIN_API_URL + "/api/capabilities");

        return isCapabilities.parse(res.data);
    }

    async fetchMapDetails(
        playUri: string,
        authToken?: string,
        locale?: string
    ): Promise<MapDetailsData | RoomRedirect | ErrorApiData> {
        try {
            let userId: string | undefined = undefined;
            let accessToken: string | undefined = undefined;
            if (authToken != undefined) {
                let authTokenData: AuthTokenData;
                try {
                    authTokenData = jwtTokenManager.verifyJWTToken(authToken);
                    userId = authTokenData.identifier;
                    accessToken = authTokenData.accessToken;
                    //eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (e) {
                    // Decode token, in this case we don't need to create new token.
                    authTokenData = jwtTokenManager.verifyJWTToken(authToken, true);
                    userId = authTokenData.identifier;
                    accessToken = authTokenData.accessToken;
                    console.info("JWT expire, but decoded:", userId);
                }
            }

            const params: { playUri: string; userId?: string; accessToken?: string } = {
                playUri,
                userId,
                accessToken,
            };

            /**
             * @openapi
             * /api/map:
             *   get:
             *     tags: ["AdminAPI"]
             *     description: Returns a map mapping map name to file name of the map
             *     security:
             *      - Bearer: []
             *     produces:
             *      - "application/json"
             *     parameters:
             *      - name: "playUri"
             *        in: "query"
             *        description: "The full URL of WorkAdventure"
             *        required: true
             *        type: "string"
             *        example: "http://play.workadventure.localhost/@/teamSlug/worldSLug/roomSlug"
             *      - name: "userId"
             *        in: "query"
             *        description: "The identifier of the current user \n It can be undefined or an uuid or an email"
             *        type: "string"
             *        example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
             *      - name: "accessToken"
             *        in: "query"
             *        description: "The OpenID access token in case the user is identified"
             *        type: "string"
             *     responses:
             *       200:
             *         description: The details of the map
             *         schema:
             *           oneOf:
             *            - $ref: "#/definitions/MapDetailsData"
             *            - $ref: "#/definitions/RoomRedirect"
             *       401:
             *         description: Error while retrieving the data because you are not authorized
             *         schema:
             *             $ref: '#/definitions/ErrorApiRedirectData'
             *       403:
             *         description: Error while retrieving the data because you are not authorized
             *         schema:
             *             $ref: '#/definitions/ErrorApiUnauthorizedData'
             *       404:
             *         description: Error while retrieving the data
             *         schema:
             *             $ref: '#/definitions/ErrorApiErrorData'
             *
             */
            const res = await axios.get<unknown, AxiosResponse<unknown>>(ADMIN_API_URL + "/api/map", {
                headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" },
                params,
            });

            const mapDetailData = isMapDetailsData.safeParse(res.data);

            if (mapDetailData.success) {
                return mapDetailData.data;
            }

            const roomRedirect = isRoomRedirect.safeParse(res.data);

            if (roomRedirect.success) {
                return roomRedirect.data;
            }

            const errorData = isErrorApiErrorData.safeParse(res.data);
            if (errorData.success) {
                return errorData.data;
            }

            console.error(
                "Invalid answer received from the admin for the /api/map endpoint. /api/map answer is not a map details answer because:",
                mapDetailData.error.issues
            );
            Sentry.captureException(mapDetailData.error.issues);
            console.error("/api/map answer is not a room redirect because:", roomRedirect.error.issues);
            console.error("/api/map answer is not an error because:", errorData.error.issues);
            return {
                status: "error",
                type: "error",
                title: "Invalid server response",
                subtitle: "Something wrong happened while fetching map details!",
                code: "MAP_VALIDATION",
                details: "The server answered with an invalid response. The administrator has been notified.",
            };
        } catch (err) {
            if (err instanceof JsonWebTokenError) {
                throw err;
            }
            let message = "Unknown error";
            if (isAxiosError(err)) {
                Sentry.captureException(err);
                console.error(`An error occurred during call to /api/map endpoint. HTTP Status: ${err.status}.`, err);
            } else {
                Sentry.captureException(err);
                console.error(`An error occurred during call to /api/map endpoint.`, err);
            }
            if (err instanceof Error) {
                message = err.message;
            }
            return {
                status: "error",
                type: "error",
                title: "Connection error",
                subtitle: "Something wrong happened while fetching map details!",
                code: "ROOM_ACCESS_ERROR",
                details: message,
            };
        }
    }

    async fetchMemberDataByUuid(
        userIdentifier: string,
        accessToken: string | undefined,
        playUri: string,
        ipAddress: string,
        characterTextureIds: string[],
        companionTextureId?: string,
        locale?: string,
        tags?: string[],
        chatID?: string
    ): Promise<FetchMemberDataByUuidResponse> {
        try {
            /**
             * @openapi
             * /api/room/access:
             *   get:
             *     tags: ["AdminAPI"]
             *     description: Returns the member's information if he can access this room
             *     security:
             *      - Bearer: []
             *     produces:
             *      - "application/json"
             *     parameters:
             *      - name: "userIdentifier"
             *        in: "query"
             *        description: "The identifier of the current user \n It can be undefined or an uuid or an email"
             *        type: "string"
             *        example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
             *      - name: "isLogged"
             *        in: "query"
             *        description: "Whether the current user is identified using OpenID Connect... or not. Can be 0 or 1"
             *        deprecated: true
             *        type: "string"
             *        example: "1"
             *      - name: "accessToken"
             *        in: "query"
             *        description: "The OpenID access token (if the user is logged)"
             *        type: "string"
             *      - name: "playUri"
             *        in: "query"
             *        description: "The full URL of WorkAdventure"
             *        required: true
             *        type: "string"
             *        example: "http://play.workadventure.localhost/@/teamSlug/worldSLug/roomSlug"
             *      - name: "ipAddress"
             *        in: "query"
             *        description: "IP Address of the user logged in, allows you to check whether a user has been banned or not"
             *        required: true
             *        type: "string"
             *        example: "127.0.0.1"
             *      - name: "characterTextureIds"
             *        in: "query"
             *        type: "array"
             *        items:
             *          type: string
             *        example: ["male1"]
             *      - name: "companionTextureId"
             *        in: "query"
             *        type: "string"
             *        example: "dog1"
             *     responses:
             *       200:
             *         description: The details of the member
             *         schema:
             *             $ref: "#/definitions/FetchMemberDataByUuidResponse"
             */
            const res = await axios.get<unknown, AxiosResponse<unknown>>(ADMIN_API_URL + "/api/room/access", {
                params: {
                    userIdentifier,
                    playUri,
                    ipAddress,
                    characterTextureIds,
                    companionTextureId,
                    accessToken,
                    isLogged: accessToken ? "1" : "0", // deprecated, use accessToken instead,
                    chatID,
                },
                headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" },
            });

            const fetchMemberDataByUuidResponse = isFetchMemberDataByUuidResponse.safeParse(res.data);

            if (fetchMemberDataByUuidResponse.success) {
                return fetchMemberDataByUuidResponse.data;
            }

            console.error(fetchMemberDataByUuidResponse.error.format());
            console.error("Message received from /api/room/access is not in the expected format. Message: ", res.data);
            Sentry.captureException(fetchMemberDataByUuidResponse.error.format());

            return {
                status: "error",
                type: "error",
                title: "Invalid server response",
                subtitle: "Something wrong happened while connecting!",
                image: "",
                code: "ROOM_ACCESS_VALIDATION",
                details: "The server answered with an invalid response. The administrator has been notified.",
            };
        } catch (err) {
            let message = "Unknown error";
            if (isAxiosError(err)) {
                Sentry.captureException(err);
                console.error(
                    `An error occurred during call to /room/access endpoint. HTTP Status: ${err.status}.`,
                    err
                );
            } else {
                Sentry.captureException(err);
                console.error(`An error occurred during call to /room/access endpoint.`, err);
            }
            if (err instanceof Error) {
                message = err.message;
            }
            return {
                status: "error",
                type: "error",
                title: "Connection error",
                subtitle: "Something wrong happened while connecting!",
                image: "",
                code: "ROOM_ACCESS_ERROR",
                details: message,
            };
        }
    }

    async fetchMemberDataByToken(
        organizationMemberToken: string,
        playUri: string | null,
        locale?: string
    ): Promise<AdminApiData> {
        /**
         * @openapi
         * /api/login-url/{organizationMemberToken}:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Returns a member from the token
         *     security:
         *      - Bearer: []
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "organizationMemberToken"
         *        in: "path"
         *        description: "The token of member in the organization"
         *        type: "string"
         *      - name: "playUri"
         *        in: "query"
         *        description: "The full URL of WorkAdventure"
         *        required: true
         *        type: "string"
         *        example: "http://play.workadventure.localhost/@/teamSlug/worldSlug/roomSlug"
         *     responses:
         *       200:
         *         description: The details of the member
         *         schema:
         *             $ref: "#/definitions/AdminApiData"
         *       401:
         *         description: Error while retrieving the data because you are not authorized
         *         schema:
         *             $ref: '#/definitions/ErrorApiRedirectData'
         *       404:
         *         description: Error while retrieving the data
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         *
         */
        //todo: this call can fail if the corresponding world is not activated or if the token is invalid. Handle that case.
        const res = await axios.get(ADMIN_API_URL + "/api/login-url/" + organizationMemberToken, {
            params: { playUri },
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" },
        });

        const adminApiData = isAdminApiData.safeParse(res.data);

        if (adminApiData.success) {
            return adminApiData.data;
        }

        console.error(adminApiData.error.issues);
        Sentry.captureException(adminApiData.error.issues);
        console.error("Message received from /api/login-url is not in the expected format. Message: ", res.data);

        throw new Error("Message received from /api/login-url is not in the expected format.");
    }

    async fetchWellKnownChallenge(host: string): Promise<string> {
        const res = await axios.get(`${ADMIN_API_URL}/white-label/cf-challenge`, {
            params: { host },
        });

        return z.string().parse(res.data);
    }

    reportPlayer(
        reportedUserUuid: string,
        reportedUserComment: string,
        reporterUserUuid: string,
        roomUrl: string,
        locale?: string
    ): Promise<unknown> {
        /**
         * @openapi
         * /api/report:
         *   post:
         *     tags: ["AdminAPI"]
         *     description: Report one user with a comment
         *     security:
         *      - Bearer: []
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "reportedUserUuid"
         *        in: "query"
         *        description: "The identifier of the reported user \n It can be an uuid or an email"
         *        type: "string"
         *        example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
         *      - name: "reportedUserComment"
         *        in: "query"
         *        description: "The comment of the report"
         *        required: true
         *        type: "string"
         *      - name: "reporterUserUuid"
         *        in: "query"
         *        description: "The identifier of the reporter user \n It can be an uuid or an email"
         *        type: "string"
         *        example: "998ce839-3dea-4698-8b41-ebbdf7688ad8"
         *      - name: "roomUrl"
         *        in: "query"
         *        description: "The URL of the room where the report is made"
         *        type: "string"
         *        example: "/@/teamSlug/worldSlug/roomSlug"
         *     responses:
         *       200:
         *         description: The report has been successfully saved
         */
        return axios.post(
            `${ADMIN_API_URL}/api/report`,
            {
                reportedUserUuid,
                reportedUserComment,
                reporterUserUuid,
                reportWorldSlug: roomUrl,
            },
            {
                headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" },
            }
        );
    }

    async verifyBanUser(
        userUuid: string,
        ipAddress: string,
        roomUrl: string,
        locale?: string
    ): Promise<AdminBannedData> {
        /**
         * @openapi
         * /api/ban:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Check if user is banned or not
         *     security:
         *      - Bearer: []
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "ipAddress"
         *        in: "query"
         *        type: "string"
         *        required: true
         *        example: "127.0.0.1"
         *      - name: "token"
         *        in: "query"
         *        description: "The uuid of the user \n It can be an uuid or an email"
         *        type: "string"
         *        required: true
         *        example: "998ce839-3dea-4698-8b41-ebbdf7688ad8"
         *      - name: "roomUrl"
         *        in: "query"
         *        description: "The slug of the world where to check if the user is banned"
         *        type: "string"
         *        required: true
         *        example: "/@/teamSlug/worldSlug/roomSlug"
         *     responses:
         *       200:
         *         description: The user is banned or not
         *         content:
         *             application/json:
         *                 schema:
         *                     type: array
         *                     required:
         *                         - is_banned
         *                 properties:
         *                     is_banned:
         *                         type: boolean
         *                         description: Whether the user is banned or not
         *                         example: true
         *       404:
         *         description: Error while retrieving the data
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         */
        //todo: this call can fail if the corresponding world is not activated or if the token is invalid. Handle that case.
        return axios
            .get(
                ADMIN_API_URL +
                    "/api/ban" +
                    "?ipAddress=" +
                    encodeURIComponent(ipAddress) +
                    "&token=" +
                    encodeURIComponent(userUuid) +
                    "&roomUrl=" +
                    encodeURIComponent(roomUrl),
                { headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" } }
            )
            .then((data) => {
                return AdminBannedData.parse(data.data);
            });
    }

    async getUrlRoomsFromSameWorld(
        roomUrl: string,
        locale?: string,
        tags?: string[],
        bypassTagFilter = false
    ): Promise<ShortMapDescriptionList> {
        /**
         * @openapi
         * /api/room/sameWorld:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Get all URLs of the rooms from the world specified
         *     security:
         *      - Bearer: []
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "roomUrl"
         *        in: "query"
         *        description: "The slug of the room"
         *        type: "string"
         *        required: true
         *        example: "/@/teamSlug/worldSlug/roomSlug"
         *     responses:
         *       200:
         *         description: The list of URL of the rooms from the same world
         *         schema:
         *             type: array
         *             items:
         *                 type: object
         *                 properties:
         *                   name:
         *                     type: string
         *                     description: Name of a room
         *                     example: "My office"
         *                     required: true
         *                   roomUrl:
         *                     type: string
         *                     description: URL of a room
         *                     example: "http://example.com/@/teamSlug/worldSlug/room2Slug"
         *                     required: true
         *                   wamUrl:
         *                     type: string
         *                     description: URL of a room
         *                     example: "http://example.com/@/teamSlug/worldSlug/room2Slug"
         *       404:
         *         description: Error while retrieving the data
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         */

        // Build the URL to call the API
        const url = new URL(`${ADMIN_API_URL}/api/room/sameWorld`);
        url.searchParams.append("roomUrl", roomUrl);
        url.searchParams.append("bypassTagFilter", String(bypassTagFilter));
        if (tags) {
            url.searchParams.append("tags", tags.join(","));
        }
        return axios
            .get<unknown>(url.toString(), {
                headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" },
            })
            .then((data) => {
                return ShortMapDescriptionList.parse(data.data);
            });
    }

    getProfileUrl(accessToken: string, playUri: string): string {
        if (!OPID_PROFILE_SCREEN_PROVIDER) {
            throw new Error("No admin backoffice set!");
        }
        return `${OPID_PROFILE_SCREEN_PROVIDER}?accessToken=${accessToken}&playUri=${playUri}`;
    }

    async logoutOauth(token: string): Promise<void> {
        await axios.get(ADMIN_API_URL + `/oauth/logout?token=${token}`);
    }

    async banUserByUuid(
        uuidToBan: string,
        playUri: string,
        name: string,
        message: string,
        byUserUuid: string
    ): Promise<boolean> {
        return axios.post(
            ADMIN_API_URL + "/api/ban",
            { uuidToBan, playUri, name, message, byUserUuid },
            {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
            }
        );
    }

    public getCapabilities(): Promise<Capabilities> {
        return this.capabilitiesDeferred.promise;
    }

    async getTagsList(roomUrl: string): Promise<string[]> {
        /**
         * @openapi
         * /api/room/tags:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Returns the list of all tags used somewhere in the room (for autocomplete purpose)
         *     security:
         *      - Bearer: []
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "roomUrl"
         *        in: "query"
         *        description: "The URL of the room"
         *        type: "string"
         *        required: true
         *        example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
         *     responses:
         *       200:
         *         description: The list of tags used in the room
         *         schema:
         *             type: array
         *             items:
         *                 type: string
         */
        const response = await axios.get(ADMIN_API_URL + "/api/room/tags" + "?roomUrl=" + encodeURIComponent(roomUrl), {
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
        });
        return z
            .string()
            .array()
            .parse(response.data ? response.data : []);
    }

    async saveName(userIdentifier: string, name: string, roomUrl: string): Promise<void> {
        if (this.capabilities["api/save-name"] === undefined) {
            // Save-name is not implemented in admin. Do nothing.
            return;
        }

        /**
         * @openapi
         * /api/save-name:
         *   post:
         *     tags: ["AdminAPI"]
         *     description: Saves the name of the Woka on the admin side.
         *     security:
         *      - Bearer: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: "object"
         *             properties:
         *               roomUrl:
         *                 type: string
         *                 required: true
         *                 description: The URL of the room
         *                 example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
         *               name:
         *                 type: string
         *                 required: true
         *                 description: The new name for the Woka
         *                 example: "Alice"
         *               userIdentifier:
         *                 type: string
         *                 required: true
         *                 description: "It can be an uuid or an email"
         *                 example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
         *     responses:
         *       204:
         *         description: Save succeeded
         *       404:
         *         description: User or room not found
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         */
        const response = await axios.post<unknown>(
            ADMIN_API_URL + "/api/save-name",
            {
                playUri: roomUrl,
                userIdentifier,
                name,
            },
            {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
            }
        );
        if (response.status !== 204) {
            throw new Error(
                "Error while saving name. Got unexpected status code. Expected 204, got " + response.status
            );
        }
        return;
    }

    async saveTextures(userIdentifier: string, textures: string[], roomUrl: string): Promise<void> {
        if (this.capabilities["api/save-textures"] === undefined) {
            // Save-name is not implemented in admin. Do nothing.
            return;
        }

        /**
         * @openapi
         * /api/save-textures:
         *   post:
         *     tags: ["AdminAPI"]
         *     description: Saves the textures of the Woka on the admin side.
         *     security:
         *      - Bearer: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: "object"
         *             properties:
         *               roomUrl:
         *                 type: string
         *                 required: true
         *                 description: The URL of the room
         *                 example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
         *               textures:
         *                 type: array
         *                 items:
         *                   type: string
         *                 required: true
         *                 description: The IDs of the textures
         *                 example: ["ab7ce839-3dea-4698-8b41-ebbdf7688ad9"]
         *               userIdentifier:
         *                 type: string
         *                 required: true
         *                 description: "It can be an uuid or an email"
         *                 example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
         *     responses:
         *       204:
         *         description: Save succeeded
         *       404:
         *         description: User or room not found
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         */
        const response = await axios.post<unknown>(
            ADMIN_API_URL + "/api/save-textures",
            {
                playUri: roomUrl,
                userIdentifier,
                textures,
            },
            {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
            }
        );
        if (response.status !== 204) {
            throw new Error(
                "Error while saving name. Got unexpected status code. Expected 204, got " + response.status
            );
        }
        return;
    }

    async saveCompanionTexture(userIdentifier: string, texture: string | null, roomUrl: string): Promise<void> {
        if (this.capabilities["api/save-textures"] === undefined) {
            // Save-name is not implemented in admin. Do nothing.
            return;
        }

        /**
         * @openapi
         * /api/save-companion-texture:
         *   post:
         *     tags: ["AdminAPI"]
         *     description: Saves the texture of the companion on the admin side.
         *     security:
         *      - Bearer: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: "object"
         *             properties:
         *               roomUrl:
         *                 type: string
         *                 required: true
         *                 description: The URL of the room
         *                 example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
         *               texture:
         *                 type: string
         *                 required: true
         *                 description: The ID of the textures
         *                 example: "ab7ce839-3dea-4698-8b41-ebbdf7688ad9"
         *               userIdentifier:
         *                 type: string
         *                 required: true
         *                 description: "It can be an uuid or an email"
         *                 example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
         *     responses:
         *       204:
         *         description: Save succeeded
         *       404:
         *         description: User or room not found
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         */
        const response = await axios.post<unknown>(
            ADMIN_API_URL + "/api/save-companion-texture",
            {
                playUri: roomUrl,
                userIdentifier,
                texture,
            },
            {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
            }
        );
        if (response.status !== 204) {
            throw new Error(
                "Error while saving name. Got unexpected status code. Expected 204, got " + response.status
            );
        }
        return;
    }

    async getWorldChatMembers(playUri: string, searchText = ""): Promise<WorldChatMembersData> {
        /**
         * @openapi
         * /api/chat/members:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Get the list of members to be displayed in the chat
         *     security:
         *      - Bearer: []
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "roomUrl"
         *        in: "query"
         *        description: "The URL of the room"
         *        type: "string"
         *        required: true
         *        example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
         *      - name: "searchText"
         *        in: "query"
         *        description: "An optional search text to filter the members"
         *        type: "string"
         *        example: "john"
         *     responses:
         *       200:
         *         description: The list of members
         *         schema:
         *             $ref: "#/definitions/WorldChatMembersData"
         *       404:
         *         description: Error while retrieving the data
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         */
        const response = await axios.get<unknown>(`${ADMIN_API_URL}/api/chat/members`, {
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
            params: {
                playUri,
                searchText,
            },
        });

        return WorldChatMembersData.parse(response.data);
    }

    /**
     * @openapi
     * /api/members:
     *   get:
     *     description: Search members from search term.
     *     tags:
     *      - Admin endpoint
     *     parameters:
     *      - name: "playUri"
     *        in: "request"
     *        required: true
     *        type: "string"
     *        description: The room url
     *      - name: "searchText"
     *        in: "request"
     *        description: search text use for user search (name, email, etc)
     *        required: true
     *        type: "string"
     *     responses:
     *       200:
     *        description: Member list or empty list.
     *        schema:
     *            $ref: '#/definitions/MemberData'
     */
    async searchMembers(playUri: string | null, searchText: string): Promise<MemberData[]> {
        const response = await axios.get<unknown>(ADMIN_API_URL + "/api/members", {
            params: { playUri, searchText },
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
        });
        return MemberData.array().parse(response.data);
    }

    /**
     * @openapi
     * /api/tags:
     */
    async searchTags(playUri: string | null, searchText: string): Promise<string[]> {
        const response = await axios.get<string[]>(`${ADMIN_API_URL}/api/world/tags`, {
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
            params: {
                playUri,
                searchText,
            },
        });
        return response.data;
    }

    /**
     * @openapi
     * /members/{memberUUID}:
     *   get:
     *     description: Get member by UUID
     *     tags:
     *      - Admin endpoint
     *     parameters:
     *      - name: "memberUUID"
     *        in: "path"
     *        required: true
     *        type: "string"
     *        description: The member UUID
     *     responses:
     *       200:
     *        schema:
     *            $ref: '#/definitions/MemberData'
     *        404:
     *        description: No member found.
     */
    async getMember(memberUUID: string): Promise<MemberData> {
        const response = await axios.get<MemberData>(`${ADMIN_API_URL}/api/members/${memberUUID}`, {
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
        });
        return response.data;
    }

    /**
     * @openapi
     * /api/members/${userIdentifier}/chatId:
     *   put:
     *     tags: ["AdminAPI"]
     *     description: Sets the Chat ID (Matrix ID) of a user. The Matrix ID is received by the client first and then sent to the server.
     *     security:
     *      - Bearer: []
     *     produces:
     *      - "application/json"
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: "object"
     *             properties:
     *               roomUrl:
     *                 type: string
     *                 required: true
     *                 description: The URL of the room
     *                 example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
     *               chatId:
     *                 type: string
     *                 required: true
     *                 description: The chat ID to be stored
     *                 example: "@john.doe:matrix.org"
     *               userIdentifier:
     *                 type: string
     *                 required: true
     *                 description: "It can be an uuid or an email"
     *                 example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
     *     responses:
     *       200:
     *         description: The report has been successfully saved
     */
    updateChatId(userIdentifier: string, chatId: string, roomUrl: string): Promise<void> {
        return axios.put(
            `${ADMIN_URL}/api/members/${userIdentifier}/chatId`,
            {
                chatId,
                userIdentifier,
                roomUrl,
            },
            {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
            }
        );
    }

    /**
     * @openapi
     * /oauth/refreshtoken/{token}:
     *   get:
     *     description: Get the refreshed token from expired one
     *     tags:
     *      - Admin endpoint
     *     parameters:
     *      - name: "token"
     *        in: "path"
     *        required: true
     *        type: "string"
     *        description: The expired refresh
     *     responses:
     *       200:
     *        schema:
     *            $ref: '#/definitions/OauthRefreshToken'
     */
    async refreshOauthToken(token: string): Promise<OauthRefreshToken> {
        const response = await axios.post(
            `${ADMIN_URL}/api/oauth/refreshtoken`,
            {
                accessToken: token,
            },
            {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
            }
        );
        const refreshTokenResponse = isOauthRefreshToken.safeParse(response.data);
        if (refreshTokenResponse.error) {
            throw new Error("Unable to parse refreshTokenResponse");
        }
        return refreshTokenResponse.data;
    }
}

export const adminApi = new AdminApi();
