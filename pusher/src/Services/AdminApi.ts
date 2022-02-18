import { ADMIN_API_TOKEN, ADMIN_API_URL, ADMIN_URL, OPID_PROFILE_SCREEN_PROVIDER } from "../Enum/EnvironmentVariable";
import Axios from "axios";
import { GameRoomPolicyTypes } from "_Model/PusherRoom";
import { CharacterTexture } from "../Messages/JsonMessages/CharacterTexture";
import { MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { RoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
import { AdminApiData, isAdminApiData } from "../Messages/JsonMessages/AdminApiData";

export interface AdminBannedData {
    is_banned: boolean;
    message: string;
}

export interface FetchMemberDataByUuidResponse {
    email: string;
    userUuid: string;
    tags: string[];
    visitCardUrl: string | null;
    textures: CharacterTexture[];
    messages: unknown[];
    anonymous?: boolean;
    userRoomToken: string | undefined;
}

class AdminApi {
    /**
     * @var playUri: is url of the room
     * @var userId: can to be undefined or email or uuid
     * @return MapDetailsData|RoomRedirect
     */
    async fetchMapDetails(playUri: string, userId?: string): Promise<MapDetailsData | RoomRedirect> {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }

        const params: { playUri: string; userId?: string } = {
            playUri,
            userId,
        };

        const res = await Axios.get(ADMIN_API_URL + "/api/map", {
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
            params,
        });
        return res.data;
    }

    async fetchMemberDataByUuid(
        userIdentifier: string | null,
        roomId: string,
        ipAddress: string
    ): Promise<FetchMemberDataByUuidResponse> {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }
        const res = await Axios.get(ADMIN_API_URL + "/api/room/access", {
            params: { userIdentifier, roomId, ipAddress },
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
        });
        return res.data;
    }

    async fetchMemberDataByToken(organizationMemberToken: string): Promise<AdminApiData> {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }
        //todo: this call can fail if the corresponding world is not activated or if the token is invalid. Handle that case.
        const res = await Axios.get(ADMIN_API_URL + "/api/login-url/" + organizationMemberToken, {
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
        });
        if (!isAdminApiData(res.data)) {
            console.error("Message received from /api/login-url is not in the expected format. Message: ", res.data);
            throw new Error("Message received from /api/login-url is not in the expected format.");
        }
        return res.data;
    }

    reportPlayer(
        reportedUserUuid: string,
        reportedUserComment: string,
        reporterUserUuid: string,
        reportWorldSlug: string
    ) {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }
        return Axios.post(
            `${ADMIN_API_URL}/api/report`,
            {
                reportedUserUuid,
                reportedUserComment,
                reporterUserUuid,
                reportWorldSlug,
            },
            {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
            }
        );
    }

    async verifyBanUser(userUuid: string, ipAddress: string, roomUrl: string): Promise<AdminBannedData> {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }
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
            { headers: { Authorization: `${ADMIN_API_TOKEN}` } }
        ).then((data) => {
            return data.data;
        });
    }

    async getUrlRoomsFromSameWorld(roomUrl: string): Promise<string[]> {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }

        return Axios.get(ADMIN_API_URL + "/api/room/sameWorld" + "?roomUrl=" + encodeURIComponent(roomUrl), {
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
        }).then((data) => {
            return data.data;
        });
    }

    /**
     *
     * @param accessToken
     */
    getProfileUrl(accessToken: string): string {
        if (!OPID_PROFILE_SCREEN_PROVIDER) {
            throw new Error("No admin backoffice set!");
        }
        return `${OPID_PROFILE_SCREEN_PROVIDER}?accessToken=${accessToken}`;
    }

    async logoutOauth(token: string) {
        await Axios.get(ADMIN_API_URL + `/oauth/logout?token=${token}`);
    }
}

export const adminApi = new AdminApi();
