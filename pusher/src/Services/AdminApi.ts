import { ADMIN_API_TOKEN, ADMIN_API_URL, OPID_PROFILE_SCREEN_PROVIDER } from "../Enum/EnvironmentVariable";
import Axios, { AxiosResponse } from "axios";
import { isMapDetailsData, MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { isRoomRedirect, RoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
import { z } from "zod";
import { isWokaDetail } from "../Messages/JsonMessages/PlayerTextures";
import qs from "qs";
import { AdminInterface } from "./AdminInterface";
import { jwtTokenManager } from "./JWTTokenManager";
import { extendApi } from "@anatine/zod-openapi";
import { isMucRoomDefinition } from "../Messages/JsonMessages/MucRoomDefinitionInterface";
import { ErrorApiData, isErrorApiData } from "../Messages/JsonMessages/ErrorApiData";
import { AdminApiData, isAdminApiData } from "../Messages/JsonMessages/AdminApiData";

export interface AdminBannedData {
    is_banned: boolean;
    message: string;
}

export const isFetchMemberDataByAuthTokenResponse = z.object({
    email: extendApi(z.string(), {
        description: "The email of the fetched user, it can be an email, an uuid or undefined.",
        example: "example@workadventu.re",
    }),
    userUuid: extendApi(z.string(), {
        description: "The uuid of the fetched user, it can be an email, an uuid or undefined.",
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
        $ref: "#/definitions/WokaDetail",
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
        example: "john.doe@myxpppserver.example.com",
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
});

export type FetchMemberDataByAuthTokenResponse = z.infer<typeof isFetchMemberDataByAuthTokenResponse>;

class AdminApi implements AdminInterface {
    async fetchMapDetails(
        playUri: string,
        authToken?: string,
        locale?: string
    ): Promise<MapDetailsData | RoomRedirect | ErrorApiData> {
        let decodedToken;

        if (authToken) {
            try {
                decodedToken = jwtTokenManager.verifyJWTToken(authToken);
                //eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
                // Decode token, in this case we don't need to create new token.
                const authTokenDataTemp = jwtTokenManager.verifyJWTToken(authToken, true);
                console.info("JWT expire, but decoded:", authTokenDataTemp.identifier);
                authToken = "";
            }
        }

        const params: { playUri: string; authToken?: string; userId?: string } = {
            playUri,
            authToken,
            userId: decodedToken?.identifier,
        };

        let res = undefined;

        try {
            /**
             * @openapi
             * /api/map:
             *   get:
             *     tags: ["AdminAPI"]
             *     description: Returns a map mapping name to file name of the map
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
             *      - name: "authToken"
             *        in: "query"
             *        description: "A JWT token which contains an identifier and some data"
             *        type: "string"
             *        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVyIjoiTm90aGluZyB0byBzZWUgaGVyZSA7KSIsImFjY2Vzc1Rva2VuIjoiZWRmYWJhYjc0ZjgzNTAzZWJhNTI4MGQzYjQyYThkZDkxZjg2MDI4Y2YyN2VjYTdhN2QzYmU1ZGMzMzNiYjg5NiIsImlhdCI6MTY2MjQ3NzAwMiwiZXhwIjoxNjY1MDY5MDAyfQ.HpZTx-kY1wlHM01uCZkIRxGrFuLTPRUf4eEHhKPYZ7g"
             *     responses:
             *       200:
             *         description: The details of the map
             *         schema:
             *             $ref: "#/definitions/MapDetailsData"
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
            res = await Axios.get<unknown, AxiosResponse<unknown>>(ADMIN_API_URL + "/api/map", {
                headers: {
                    Authorization: `${ADMIN_API_TOKEN}`,
                    "Accept-Language": locale ?? "en",
                    "User-Agent": "Pusher",
                },
                params,
            });
        } catch (err) {
            if (Axios.isAxiosError(err)) {
                if (err.response?.status === 404) {
                    console.warn(err.message, "/api/map", playUri);
                } else {
                    console.error(err.message, "/api/map", playUri);
                }

                const isApiError = isErrorApiData.safeParse(err.response?.data);

                if (isApiError.success) {
                    return isApiError.data;
                }

                console.log(isApiError.error.issues);

                throw new Error("Uncatchable error on /api/map endpoint.");
            } else {
                console.warn(err);
            }
        }

        if (!res) {
            throw new Error("Error received from the admin for the /api/map endpoint.");
        }

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

    async fetchMemberDataByAuthToken(
        authToken: string,
        playUri: string,
        ipAddress: string,
        characterLayers: string[],
        locale?: string
    ): Promise<FetchMemberDataByAuthTokenResponse | (ErrorApiData & { httpCode: number })> {
        let res = undefined;
        let decodedToken;

        if (authToken) {
            try {
                decodedToken = jwtTokenManager.verifyJWTToken(authToken);
                //eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
                // Decode token, in this case we don't need to create new token.
                const authTokenDataTemp = jwtTokenManager.verifyJWTToken(authToken, true);
                console.info("JWT expire, but decoded:", authTokenDataTemp.identifier);
            }
        }

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
             *      - name: "authToken"
             *        in: "query"
             *        description: "A JWT token which contains an identifier and some data"
             *        type: "string"
             *        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVyIjoiTm90aGluZyB0byBzZWUgaGVyZSA7KSIsImFjY2Vzc1Rva2VuIjoiZWRmYWJhYjc0ZjgzNTAzZWJhNTI4MGQzYjQyYThkZDkxZjg2MDI4Y2YyN2VjYTdhN2QzYmU1ZGMzMzNiYjg5NiIsImlhdCI6MTY2MjQ3NzAwMiwiZXhwIjoxNjY1MDY5MDAyfQ.HpZTx-kY1wlHM01uCZkIRxGrFuLTPRUf4eEHhKPYZ7g"
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
             *             $ref: "#/definitions/FetchMemberDataByAuthTokenResponse"
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
            res = await Axios.get<unknown, AxiosResponse<unknown>>(ADMIN_API_URL + "/api/room/access", {
                params: {
                    authToken,
                    userIdentifier: decodedToken?.identifier,
                    playUri,
                    ipAddress,
                    characterLayers,
                },
                headers: {
                    Authorization: `${ADMIN_API_TOKEN}`,
                    "Accept-Language": locale ?? "en",
                    "User-Agent": "Pusher",
                },
                paramsSerializer: (p) => {
                    return qs.stringify(p, { arrayFormat: "brackets" });
                },
            });
        } catch (err) {
            if (Axios.isAxiosError(err)) {
                if (!err.response) {
                    console.error(err);
                    throw new Error("No response received from /api/room/access endpoing");
                }

                if (err.response?.status === 404) {
                    console.warn(err.message, "/api/map", playUri);
                } else {
                    console.error(err.message, "/api/map", playUri);
                }

                const isApiError = isErrorApiData.safeParse(err.response.data);

                if (isApiError.success) {
                    return {
                        ...isApiError.data,
                        httpCode: err.response.status,
                    };
                }

                console.log(isApiError.error.issues);

                throw new Error("Uncatchable error on /api/room/access endpoint.");
            } else {
                console.warn(err);
            }
        }

        if (!res) {
            throw new Error("Error received from the admin for the /api/room/access endpoint.");
        }

        const fetchMemberDataByAuthTokenResponse = isFetchMemberDataByAuthTokenResponse.safeParse(res.data);

        if (fetchMemberDataByAuthTokenResponse.success) {
            return fetchMemberDataByAuthTokenResponse.data;
        }

        console.error(fetchMemberDataByAuthTokenResponse.error.issues);
        throw new Error(
            "Invalid answer received from the admin for the /api/room/access endpoint. Received: " +
                JSON.stringify(res.data)
        );
    }

    async fetchLoginData(authToken: string, playUri: string | null, locale?: string): Promise<AdminApiData> {
        /**
         * @openapi
         * /api/login-url/{authToken}:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Returns a member from the token
         *     security:
         *      - Bearer: []
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "authToken"
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
        const res = await Axios.get(ADMIN_API_URL + "/api/login-url/" + authToken, {
            params: { playUri },
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en", "User-Agent": "Pusher" },
        });

        const adminApiData = isAdminApiData.safeParse(res.data);

        if (adminApiData.success) {
            return adminApiData.data;
        }

        console.error(adminApiData.error.issues);
        console.error("Message received from /api/login-url is not in the expected format. Message: ", res.data);
        throw new Error("Message received from /api/login-url is not in the expected format.");
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
                headers: {
                    Authorization: `${ADMIN_API_TOKEN}`,
                    "Accept-Language": locale ?? "en",
                    "User-Agent": "Pusher",
                },
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
            {
                headers: {
                    Authorization: `${ADMIN_API_TOKEN}`,
                    "Accept-Language": locale ?? "en",
                    "User-Agent": "Pusher",
                },
            }
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
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": locale ?? "en", "User-Agent": "Pusher" },
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
                    headers: { Authorization: `${ADMIN_API_TOKEN}`, "User-Agent": "Pusher" },
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
