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
        playUri: string,
        ipAddress: string,
        characterLayers: string[],
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

    fetchMapDetails(playUri: string, authToken?: string, locale?: string): Promise<MapDetailsData | RoomRedirect> {
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
            showPoweredBy: true,
        });
    }

    async fetchMemberDataByToken(
        organizationMemberToken: string,
        playUri: string | null,
        locale?: string
    ): Promise<AdminApiData> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    reportPlayer(
        reportedUserUuid: string,
        reportedUserComment: string,
        reporterUserUuid: string,
        reportWorldSlug: string,
        locale?: string
    ) {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    async verifyBanUser(
        userUuid: string,
        ipAddress: string,
        roomUrl: string,
        locale?: string
    ): Promise<AdminBannedData> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    async getUrlRoomsFromSameWorld(roomUrl: string, locale?: string): Promise<string[]> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    getProfileUrl(accessToken: string): string {
        new Error("No admin backoffice set!");
        return "";
    }
}

export const localAdmin = new LocalAdmin();
