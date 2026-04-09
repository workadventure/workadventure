import type {
    AdminApiData,
    MapDetailsData,
    OauthRefreshToken,
    RoomRedirect,
    Capabilities,
    IceServer,
} from "@workadventure/messages";
import {
    isOauthRefreshToken,
    MemberData,
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
import { Deferred } from "@workadventure/shared-utils";
import { fetch, HttpError } from "@workadventure/shared-utils/src/Fetch/nodeFetch";
import { errors } from "jose";
import {
    ADMIN_API_RETRY_DELAY,
    ADMIN_API_TOKEN,
    ADMIN_API_URL,
    OPID_PROFILE_SCREEN_PROVIDER,
    ADMIN_URL,
} from "../enums/EnvironmentVariable";
import { IceServer as IceServerSchema } from "./IceServer";
import type { AdminInterface } from "./AdminInterface";
import type { AuthTokenData } from "./JWTTokenManager";
import { jwtTokenManager } from "./JWTTokenManager";
import { ShortMapDescriptionList } from "./ShortMapDescription";
import { WorldChatMembersData } from "./WorldChatMembersData";
import { iceServersService } from "./IceServersService";

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
    canRecord: extendApi(z.boolean().optional(), {
        description:
            "True if the user can record the room. In addition to this, the user still needs to have the correct tags as defined in the WAM settings.",
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

type QueryParamValue = string | number | boolean | string[] | null | undefined;

class AdminApi implements AdminInterface {
    private capabilities: Capabilities = {};
    private capabilitiesDeferred = new Deferred<Capabilities>();

    private buildAdminUrl(path: string, params?: Record<string, QueryParamValue>): URL {
        const url = new URL(path, ADMIN_API_URL);

        for (const [key, value] of Object.entries(params ?? {})) {
            if (value === undefined || value === null) {
                continue;
            }

            if (Array.isArray(value)) {
                for (const item of value) {
                    url.searchParams.append(`${key}[]`, item);
                }
                continue;
            }

            url.searchParams.set(key, String(value));
        }

        return url;
    }

    private getAdminHeaders(locale?: string, json = false): HeadersInit {
        const headers = new Headers({
            Authorization: `${ADMIN_API_TOKEN}`,
        });

        if (locale) {
            headers.set("Accept-Language", locale);
        }

        if (json) {
            headers.set("Content-Type", "application/json");
        }

        return headers;
    }

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
                if (ex instanceof HttpError && ex.status === 404) {
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
        const res = await fetch(this.buildAdminUrl("/api/capabilities"));

        return isCapabilities.parse((await res.json()) as unknown);
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
                    authTokenData = await jwtTokenManager.verifyJWTToken(authToken);
                    userId = authTokenData.identifier;
                    accessToken = authTokenData.accessToken;
                    //eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (e) {
                    // Decode token, in this case we don't need to create new token.
                    authTokenData = await jwtTokenManager.verifyJWTToken(authToken, true);
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
            const res = await fetch(this.buildAdminUrl("/api/map", params), {
                headers: this.getAdminHeaders(locale ?? "en"),
            });

            const data = (await res.json()) as unknown;
            const mapDetailData = isMapDetailsData.safeParse(data);

            if (mapDetailData.success) {
                return mapDetailData.data;
            }

            const roomRedirect = isRoomRedirect.safeParse(data);

            if (roomRedirect.success) {
                return roomRedirect.data;
            }

            const errorData = isErrorApiErrorData.safeParse(data);
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
            if (err instanceof errors.JWTInvalid || err instanceof errors.JWTExpired) {
                throw err;
            }
            let message = "Unknown error";
            if (err instanceof HttpError) {
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
            const res = await fetch(
                this.buildAdminUrl("/api/room/access", {
                    userIdentifier,
                    playUri,
                    ipAddress,
                    characterTextureIds,
                    companionTextureId,
                    accessToken,
                    isLogged: accessToken ? "1" : "0", // deprecated, use accessToken instead,
                    chatID,
                }),
                {
                    headers: this.getAdminHeaders(locale ?? "en"),
                }
            );

            const data = (await res.json()) as unknown;
            const fetchMemberDataByUuidResponse = isFetchMemberDataByUuidResponse.safeParse(data);

            if (fetchMemberDataByUuidResponse.success) {
                return fetchMemberDataByUuidResponse.data;
            }
            console.error(fetchMemberDataByUuidResponse.error.format());
            console.error("Message received from /api/room/access is not in the expected format. Message: ", data);
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
            if (err instanceof HttpError) {
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
        const res = await fetch(this.buildAdminUrl(`/api/login-url/${organizationMemberToken}`, { playUri }), {
            headers: this.getAdminHeaders(locale ?? "en"),
        });

        const data = (await res.json()) as unknown;
        const adminApiData = isAdminApiData.safeParse(data);

        if (adminApiData.success) {
            return adminApiData.data;
        }

        console.error(adminApiData.error.issues);
        Sentry.captureException(adminApiData.error.issues);
        console.error("Message received from /api/login-url is not in the expected format. Message: ", data);

        throw new Error("Message received from /api/login-url is not in the expected format.");
    }

    async fetchWellKnownChallenge(host: string): Promise<string> {
        const res = await fetch(this.buildAdminUrl("/white-label/cf-challenge", { host }));

        return z.string().parse(await res.text());
    }

    async reportPlayer(
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
        await fetch(this.buildAdminUrl("/api/report"), {
            method: "POST",
            headers: this.getAdminHeaders(locale ?? "en", true),
            body: JSON.stringify({
                reportedUserUuid,
                reportedUserComment,
                reporterUserUuid,
                reportWorldSlug: roomUrl,
            }),
        });

        return undefined;
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
        const response = await fetch(
            this.buildAdminUrl("/api/ban", {
                ipAddress,
                token: userUuid,
                roomUrl,
            }),
            {
                headers: this.getAdminHeaders(locale ?? "en"),
            }
        );

        return AdminBannedData.parse((await response.json()) as unknown);
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

        const response = await fetch(
            this.buildAdminUrl("/api/room/sameWorld", {
                roomUrl,
                bypassTagFilter,
                tags: tags?.join(","),
            }),
            {
                headers: this.getAdminHeaders(locale ?? "en"),
            }
        );

        return ShortMapDescriptionList.parse((await response.json()) as unknown);
    }

    getProfileUrl(accessToken: string, playUri: string): string {
        if (!OPID_PROFILE_SCREEN_PROVIDER) {
            throw new Error("No admin backoffice set!");
        }
        return `${OPID_PROFILE_SCREEN_PROVIDER}?accessToken=${accessToken}&playUri=${playUri}`;
    }

    async logoutOauth(token: string): Promise<void> {
        await fetch(this.buildAdminUrl("/oauth/logout", { token }));
    }

    async banUserByUuid(
        uuidToBan: string,
        playUri: string,
        name: string,
        message: string,
        byUserUuid: string
    ): Promise<boolean> {
        await fetch(this.buildAdminUrl("/api/ban"), {
            method: "POST",
            headers: this.getAdminHeaders(undefined, true),
            body: JSON.stringify({ uuidToBan, playUri, name, message, byUserUuid }),
        });

        return true;
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
        const response = await fetch(this.buildAdminUrl("/api/room/tags", { roomUrl }), {
            headers: this.getAdminHeaders(),
        });
        return z
            .string()
            .array()
            .parse((await response.json()) as unknown);
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
        const response = await fetch(this.buildAdminUrl("/api/save-name"), {
            method: "POST",
            headers: this.getAdminHeaders(undefined, true),
            body: JSON.stringify({
                playUri: roomUrl,
                userIdentifier,
                name,
            }),
        });
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
        const response = await fetch(this.buildAdminUrl("/api/save-textures"), {
            method: "POST",
            headers: this.getAdminHeaders(undefined, true),
            body: JSON.stringify({
                playUri: roomUrl,
                userIdentifier,
                textures,
            }),
        });
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
        const response = await fetch(this.buildAdminUrl("/api/save-companion-texture"), {
            method: "POST",
            headers: this.getAdminHeaders(undefined, true),
            body: JSON.stringify({
                playUri: roomUrl,
                userIdentifier,
                texture,
            }),
        });
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
        const response = await fetch(
            this.buildAdminUrl("/api/chat/members", {
                playUri,
                searchText,
            }),
            {
                headers: this.getAdminHeaders(),
            }
        );

        return WorldChatMembersData.parse((await response.json()) as unknown);
    }

    /**
     * @openapi
     * /api/members:
     *   get:
     *     description: Search members from search term.
     *     tags:
     *      - AdminAPI
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
        const response = await fetch(
            this.buildAdminUrl("/api/members", {
                playUri,
                searchText,
            }),
            {
                headers: this.getAdminHeaders(),
            }
        );
        return MemberData.array().parse((await response.json()) as unknown);
    }

    /**
     * @openapi
     * /api/tags:
     */
    async searchTags(playUri: string | null, searchText: string): Promise<string[]> {
        const response = await fetch(
            this.buildAdminUrl("/api/world/tags", {
                playUri,
                searchText,
            }),
            {
                headers: this.getAdminHeaders(),
            }
        );
        return z
            .string()
            .array()
            .parse((await response.json()) as unknown);
    }

    /**
     * @openapi
     * /members/{memberUUID}:
     *   get:
     *     description: Get member by UUID
     *     tags:
     *      - AdminAPI
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
     *       404:
     *        description: No member found.
     */
    async getMember(memberUUID: string): Promise<MemberData> {
        const response = await fetch(this.buildAdminUrl(`/api/members/${memberUUID}`), {
            headers: this.getAdminHeaders(),
        });
        return MemberData.parse((await response.json()) as unknown);
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
    async updateChatId(userIdentifier: string, chatId: string, roomUrl: string): Promise<void> {
        await fetch(new URL(`/api/members/${userIdentifier}/chatId`, ADMIN_URL), {
            method: "PUT",
            headers: this.getAdminHeaders(undefined, true),
            body: JSON.stringify({
                chatId,
                userIdentifier,
                roomUrl,
            }),
        });
    }

    /**
     * @openapi
     * /oauth/refreshtoken/{token}:
     *   get:
     *     description: Get the refreshed token from expired one
     *     tags:
     *      - AdminAPI
     *     parameters:
     *      - name: "token"
     *        in: "path"
     *        required: true
     *        type: "string"
     *        description: The expired refresh
     *      - name: "provider"
     *        in: "query"
     *        required: false
     *        type: "string"
     *        description: The provider of the user
     *        example: "google"
     *      - name: "userIdentifier"
     *        in: "query"
     *        required: false
     *        type: "string"
     *        description: The identifier of the user
     *        example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
     *     responses:
     *       200:
     *        schema:
     *            $ref: '#/definitions/OauthRefreshToken'
     */
    async refreshOauthToken(token: string, provider?: string, userIdentifier?: string): Promise<OauthRefreshToken> {
        const response = await fetch(new URL("/api/oauth/refreshtoken", ADMIN_URL), {
            method: "POST",
            headers: this.getAdminHeaders(undefined, true),
            body: JSON.stringify({
                accessToken: token,
                provider,
                userIdentifier,
            }),
        });
        const refreshTokenResponse = isOauthRefreshToken.safeParse((await response.json()) as unknown);
        if (refreshTokenResponse.error) {
            throw new Error("Unable to parse refreshTokenResponse");
        }
        return refreshTokenResponse.data;
    }

    /**
     * @openapi
     * /api/ice-servers:
     *   get:
     *     tags: ["AdminAPI"]
     *     description: Returns a list of ICE servers to be used for WebRTC connections
     *     security:
     *      - Bearer: []
     *     produces:
     *      - "application/json"
     *     parameters:
     *      - name: "roomUrl"
     *        in: "query"
     *        description: "The full URL to the current WorkAdventure room"
     *        required: true
     *        type: "string"
     *        example: "http://play.workadventure.localhost/@/teamSlug/worldSlug/roomSlug"
     *      - name: "userIdentifier"
     *        in: "query"
     *        description: "The identifier of the current user. It can be undefined, a UUID, or an email."
     *        type: "string"
     *        example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
     *     responses:
     *       200:
     *         description: The list of ice servers
     *         schema:
     *           type: array
     *           items:
     *             $ref: "#/definitions/IceServer"
     *       401:
     *         description: Error while retrieving the data because you are not authorized
     *         schema:
     *             $ref: '#/definitions/ErrorApiRedirectData'
     *       403:
     *         description: Error while retrieving the data because you are not authorized
     *         schema:
     *             $ref: '#/definitions/ErrorApiUnauthorizedData'
     *       404:
     *         description: Room not found
     */
    async getIceServers(userId: number, userIdentifier: string, roomUrl: string): Promise<IceServer[]> {
        if (this.capabilities["api/ice-servers"] === undefined) {
            // ice-servers is not implemented in admin. Fallback to local env vars
            return iceServersService.generateIceServers(userId.toString());
        }

        const response = await fetch(
            new URL(
                `/api/ice-servers?${new URLSearchParams({
                    roomUrl,
                    userIdentifier,
                }).toString()}`,
                ADMIN_URL
            ),
            {
                headers: this.getAdminHeaders(),
            }
        );

        return IceServerSchema.array().parse((await response.json()) as unknown);
    }
}

export const adminApi = new AdminApi();
