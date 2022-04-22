import { AdminBannedData, FetchMemberDataByUuidResponse } from "./AdminApi";
import { AdminInterface } from "./AdminInterface";
import { MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { RoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
import { GameRoomPolicyTypes } from "../Model/PusherRoom";
import { DISABLE_ANONYMOUS } from "../Enum/EnvironmentVariable";
import { AdminApiData } from "../Messages/JsonMessages/AdminApiData";

/**
 * A local class mocking a real admin if no admin is configured.
 */
class LocalAdmin implements AdminInterface {
    fetchMemberDataByUuid(
        userIdentifier: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        playUri: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ipAddress: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        characterLayers: string[],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        locale?: string
    ): Promise<FetchMemberDataByUuidResponse> {
        return Promise.resolve({
            email: userIdentifier,
            userUuid: userIdentifier,
            tags: [],
            messages: [],
            visitCardUrl: null,
            textures: [],
            userRoomToken: undefined,
        });
    }

    fetchMapDetails(
        playUri: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        authToken?: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        locale?: string
    ): Promise<MapDetailsData | RoomRedirect> {
        const roomUrl = new URL(playUri);

        const match = /\/_\/[^/]+\/(.+)/.exec(roomUrl.pathname);
        if (!match) {
            throw new Error("URL format is not good");
        }

        const mapUrl = roomUrl.protocol + "//" + match[1];

        return Promise.resolve({
            mapUrl,
            policy_type: GameRoomPolicyTypes.ANONYMOUS_POLICY,
            tags: [],
            authenticationMandatory: DISABLE_ANONYMOUS,
            roomSlug: null,
            contactPage: null,
            group: null,
            iframeAuthentication: null,
            loadingLogo: null,
            loginSceneLogo: null,
        });
    }

    async fetchMemberDataByToken(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        organizationMemberToken: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        playUri: string | null,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        locale?: string
    ): Promise<AdminApiData> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    reportPlayer(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        reportedUserUuid: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        reportedUserComment: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        reporterUserUuid: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        reportWorldSlug: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        locale?: string
    ) {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    async verifyBanUser(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        userUuid: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ipAddress: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        roomUrl: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        locale?: string
    ): Promise<AdminBannedData> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    async getUrlRoomsFromSameWorld(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        roomUrl: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        locale?: string
    ): Promise<string[]> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    getProfileUrl(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        accessToken: string
    ): string {
        new Error("No admin backoffice set!");
        return "";
    }

    async logoutOauth(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        token: string
    ): Promise<void> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }
}

export const localAdmin = new LocalAdmin();
