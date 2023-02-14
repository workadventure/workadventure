import {
    ADMIN_API_TOKEN,
    ADMIN_API_URL,
    OPID_PROFILE_SCREEN_PROVIDER,
    ADMIN_API_RETRY_DELAY,
} from "../enums/EnvironmentVariable";
import Axios from "axios";
import type { AxiosResponse } from "axios";
import {
    isMapDetailsData,
    isRoomRedirect,
    isAdminApiData,
    isWokaDetail,
    isMucRoomDefinition,
    isApplicationDefinitionInterface,
    isCapabilities,
    Capabilities,
} from "@workadventure/messages";
import type { MapDetailsData, RoomRedirect, AdminApiData } from "@workadventure/messages";
import { z } from "zod";
import type { AdminInterface } from "./AdminInterface";
import { jwtTokenManager } from "./JWTTokenManager";
import type { AuthTokenData } from "./JWTTokenManager";
import { extendApi } from "@anatine/zod-openapi";
import type { AdminCapabilities } from "./adminApi/AdminCapabilities";
import { RemoteCapabilities } from "./adminApi/RemoteCapabilities";
import { LocalCapabilities } from "./adminApi/LocalCapabilities";

export interface AdminBannedData {
    is_banned: boolean;
    message: string;
}

export const isFetchMemberDataByUuidResponse = z.object({
    email: extendApi(z.string().nullable(), {
        description: "The email of the fetched user, it can be an email, an uuid or null.",
        example: "example@workadventu.re",
    }),
    username: extendApi(z.string().optional().nullable(), {
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
    textures: extendApi(z.array(isWokaDetail), {
        description: "This data represents the textures (WOKA) that will be available to users.",
    }),
    messages: extendApi(z.array(z.unknown()), {
        description:
            "Sets messages that will be displayed when the user logs in to the WA room. These messages are used for ban or ban warning.",
    }),

    anonymous: extendApi(z.boolean().optional(), {
        description: "Defines whether it is possible to login as anonymous on a WorkAdventure room.",
        example: false,
    }),
    userRoomToken: extendApi(z.optional(z.string()), { description: "", example: "" }),
    jabberId: extendApi(z.string().nullable().optional(), {
        description: "The jid (JabberID) that can be used to connect this particular user to its XMPP server",
        example: "john.doe@myxpppserver.example.com/uuid",
    }),
    jabberPassword: extendApi(z.string().nullable().optional(), {
        description: "The password to connect to the XMPP server of this user",
    }),
    mucRooms: extendApi(z.nullable(z.array(isMucRoomDefinition)), {
        description: "The MUC room is a room of message",
    }),
    activatedInviteUser: extendApi(z.boolean().nullable().optional(), {
        description: "Button invite is activated in the action bar",
    }),
    applications: extendApi(z.array(isApplicationDefinitionInterface).nullable().optional(), {
        description: "The applications run into the customer's world",
    }),
});

export type FetchMemberDataByUuidResponse = z.infer<typeof isFetchMemberDataByUuidResponse>;

class AdminApi implements AdminInterface {
    private capabilities: AdminCapabilities = new LocalCapabilities();

    /**
     * Checks whether admin api is enabled
     */
    isEnabled(): boolean {
        return !!ADMIN_API_URL;
    }

    async initialise(): Promise<AdminCapabilities> {
        if (!this.isEnabled()) {
            console.info("Admin API not configured. Will use local implementations");
            return this.capabilities;
        }

        console.log(`Admin api is enabled at ${ADMIN_API_URL}. Will check connection and capabilities`);
        let warnIssued = false;
        const queryCapabilities = async (resolve: (_v: unknown) => void): Promise<void> => {
            try {
                const capabilities = await this.fetchCapabilities();
                this.capabilities = new RemoteCapabilities(new Map<string, string>(Object.entries(capabilities)));
                console.info(`Capabilities query successful. Found capabilities: ${this.capabilities.info()}`);
                resolve(0);
            } catch (ex) {
                // ignore errors when querying capabilities
                const status = (ex as { response: { status: number } })?.response?.status;
                if (status === 404) {
                    // 404 probably means and older api version
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
                    void queryCapabilities(resolve);
                }, ADMIN_API_RETRY_DELAY);
            }
        };
        await new Promise((resolve) => {
            void queryCapabilities(resolve);
        });
        console.log(`Remote admin api connection successful at ${ADMIN_API_URL}`);
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
        const res = await Axios.get<unknown, AxiosResponse<string[]>>(ADMIN_API_URL + "/api/capabilities");

        return isCapabilities.parse(res.data);
    }

    async fetchMapDetails(
        playUri: string,
        authToken?: string,
        locale?: string
    ): Promise<MapDetailsData | RoomRedirect> {
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
        const res = await Axios.get<unknown, AxiosResponse<unknown>>(ADMIN_API_URL + "/api/map", {
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

        console.error(mapDetailData.error.issues);
        console.error(roomRedirect.error.issues);
        throw new Error(
            "Invalid answer received from the admin for the /api/map endpoint. Received: " + JSON.stringify(res.data)
        );
    }

    async fetchMemberDataByUuid(
        userIdentifier: string,
        accessToken: string | undefined,
        playUri: string,
        ipAddress: string,
        characterLayers: string[],
        locale?: string
    ): Promise<FetchMemberDataByUuidResponse> {
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
         *      - name: "characterLayers"
         *        in: "query"
         *        type: "array"
         *        items:
         *          type: string
         *        example: ["male1"]
         *     responses:
         *       200:
         *         description: The details of the member
         *         schema:
         *             $ref: "#/definitions/FetchMemberDataByUuidResponse"
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
        const res = await Axios.get<unknown, AxiosResponse<unknown>>(ADMIN_API_URL + "/api/room/access", {
            params: {
                userIdentifier,
                playUri,
                ipAddress,
                characterLayers,
                accessToken,
                isLogged: accessToken ? "1" : "0", // deprecated, use accessToken instead
            },
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" },
        });

        const fetchMemberDataByUuidResponse = isFetchMemberDataByUuidResponse.safeParse(res.data);

        if (fetchMemberDataByUuidResponse.success) {
            return fetchMemberDataByUuidResponse.data;
        }

        console.error(fetchMemberDataByUuidResponse.error.issues);
        throw new Error(
            "Invalid answer received from the admin for the /api/room/access endpoint. Received: " +
                JSON.stringify(res.data)
        );
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
         *        example: "http://play.workadventure.localhost/@/teamSlug/worldSLug/roomSlug"
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
        const res = await Axios.get(ADMIN_API_URL + "/api/login-url/" + organizationMemberToken, {
            params: { playUri },
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" },
        });

        const adminApiData = isAdminApiData.safeParse(res.data);

        if (adminApiData.success) {
            return adminApiData.data;
        }

        console.error(adminApiData.error.issues);
        console.error("Message received from /api/login-url is not in the expected format. Message: ", res.data);
        throw new Error("Message received from /api/login-url is not in the expected format.");
    }

    async fetchWellKnownChallenge(host: string): Promise<string> {
        const res = await Axios.get(`${ADMIN_API_URL}/white-label/cf-challenge`, {
            params: { host },
        });

        return res.data;
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
        return Axios.post(
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
        return Axios.get(
            ADMIN_API_URL +
                "/api/ban" +
                "?ipAddress=" +
                encodeURIComponent(ipAddress) +
                "&token=" +
                encodeURIComponent(userUuid) +
                "&roomUrl=" +
                encodeURIComponent(roomUrl),
            { headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" } }
        ).then((data) => {
            return data.data;
        });
    }

    async getUrlRoomsFromSameWorld(roomUrl: string, locale?: string): Promise<string[]> {
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
         *                 type: string
         *                 description: URL of a room
         *                 example: "http://example.com/@/teamSlug/worldSlug/room2Slug"
         *       404:
         *         description: Error while retrieving the data
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         */
        return Axios.get(ADMIN_API_URL + "/api/room/sameWorld" + "?roomUrl=" + encodeURIComponent(roomUrl), {
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en" },
        }).then((data) => {
            return data.data;
        });
    }

    getProfileUrl(accessToken: string, playUri: string): string {
        if (!OPID_PROFILE_SCREEN_PROVIDER) {
            throw new Error("No admin backoffice set!");
        }
        return `${OPID_PROFILE_SCREEN_PROVIDER}?accessToken=${accessToken}&playUri=${playUri}`;
    }

    async logoutOauth(token: string): Promise<void> {
        await Axios.get(ADMIN_API_URL + `/oauth/logout?token=${token}`);
    }

    async banUserByUuid(
        uuidToBan: string,
        playUri: string,
        name: string,
        message: string,
        byUserEmail: string
    ): Promise<boolean> {
        try {
            return Axios.post(
                ADMIN_API_URL + "/api/ban",
                { uuidToBan, playUri, name, message, byUserEmail },
                {
                    headers: { Authorization: `${ADMIN_API_TOKEN}` },
                }
            );
        } catch (err) {
            return new Promise((solve, reject) => {
                reject(err);
            });
        }
    }
}

export const adminApi = new AdminApi();
