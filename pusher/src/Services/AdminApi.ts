import { ADMIN_API_TOKEN, ADMIN_API_URL, OPID_PROFILE_SCREEN_PROVIDER } from "../Enum/EnvironmentVariable";
import Axios, { AxiosResponse } from "axios";
import { isMapDetailsData, MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { isRoomRedirect, RoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
import { AdminApiData, isAdminApiData } from "../Messages/JsonMessages/AdminApiData";
import { z } from "zod";
import { isWokaDetail } from "../Messages/JsonMessages/PlayerTextures";
import qs from "qs";
import { AdminInterface } from "./AdminInterface";
import { AuthTokenData, jwtTokenManager } from "./JWTTokenManager";
import { InvalidTokenError } from "../Controller/InvalidTokenError";

export interface AdminBannedData {
    is_banned: boolean;
    message: string;
}

export const isFetchMemberDataByUuidResponse = z.object({
    email: z.string(),
    userUuid: z.string(),
    tags: z.array(z.string()),
    visitCardUrl: z.nullable(z.string()),
    textures: z.array(isWokaDetail),
    messages: z.array(z.unknown()),
    anonymous: z.optional(z.boolean()),
    userRoomToken: z.optional(z.string()),
});

export type FetchMemberDataByUuidResponse = z.infer<typeof isFetchMemberDataByUuidResponse>;

class AdminApi implements AdminInterface {
    locale: string = "en";

    async fetchMapDetails(playUri: string, authToken?: string): Promise<MapDetailsData | RoomRedirect> {
        let userId: string | undefined = undefined;
        if (authToken != undefined) {
            let authTokenData: AuthTokenData;
            try {
                authTokenData = jwtTokenManager.verifyJWTToken(authToken);
                userId = authTokenData.identifier;
            } catch (e) {
                try {
                    // Decode token, in this case we don't need to create new token.
                    authTokenData = jwtTokenManager.verifyJWTToken(authToken, true);
                    userId = authTokenData.identifier;
                    console.info("JWT expire, but decoded", userId);
                } catch (e) {
                    if (e instanceof InvalidTokenError) {
                        throw new Error("Token decrypted error");
                        // The token was not good, redirect user on login page
                        //res.status(401);
                        //res.send("Token decrypted error");
                        //return;
                    } else {
                        throw new Error("Error on decryption of token :" + e);
                        //this.castErrorToResponse(e, res);
                        //return;
                    }
                }
            }
        }

        const params: { playUri: string; userId?: string } = {
            playUri,
            userId,
        };

        const res = await Axios.get<unknown, AxiosResponse<unknown>>(ADMIN_API_URL + "/api/map", {
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": this.locale },
            params,
        });

        const mapDetailData = isMapDetailsData.safeParse(res.data);
        const roomRedirect = isRoomRedirect.safeParse(res.data);

        if (mapDetailData.success) {
            return mapDetailData.data;
        }

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
        playUri: string,
        ipAddress: string,
        characterLayers: string[]
    ): Promise<FetchMemberDataByUuidResponse> {
        const res = await Axios.get<unknown, AxiosResponse<unknown>>(ADMIN_API_URL + "/api/room/access", {
            params: {
                userIdentifier,
                playUri,
                ipAddress,
                characterLayers,
            },
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": this.locale },
            paramsSerializer: (p) => {
                return qs.stringify(p, { arrayFormat: "brackets" });
            },
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

    async fetchMemberDataByToken(organizationMemberToken: string, playUri: string | null): Promise<AdminApiData> {
        //todo: this call can fail if the corresponding world is not activated or if the token is invalid. Handle that case.
        const res = await Axios.get(ADMIN_API_URL + "/api/login-url/" + organizationMemberToken, {
            params: { playUri },
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": this.locale },
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
        reportWorldSlug: string
    ) {
        return Axios.post(
            `${ADMIN_API_URL}/api/report`,
            {
                reportedUserUuid,
                reportedUserComment,
                reporterUserUuid,
                reportWorldSlug,
            },
            {
                headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": this.locale },
            }
        );
    }

    async verifyBanUser(userUuid: string, ipAddress: string, roomUrl: string): Promise<AdminBannedData> {
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
            { headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": this.locale } }
        ).then((data) => {
            return data.data;
        });
    }

    async getUrlRoomsFromSameWorld(roomUrl: string): Promise<string[]> {
        return Axios.get(ADMIN_API_URL + "/api/room/sameWorld" + "?roomUrl=" + encodeURIComponent(roomUrl), {
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "Accept-Language": this.locale },
        }).then((data) => {
            return data.data;
        });
    }

    getProfileUrl(accessToken: string): string {
        if (!OPID_PROFILE_SCREEN_PROVIDER) {
            throw new Error("No admin backoffice set!");
        }
        return `${OPID_PROFILE_SCREEN_PROVIDER}?accessToken=${accessToken}`;
    }

    async logoutOauth(token: string): Promise<void> {
        await Axios.get(ADMIN_API_URL + `/oauth/logout?token=${token}`);
    }
}

export const adminApi = new AdminApi();
