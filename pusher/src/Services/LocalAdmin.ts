import { AdminBannedData, FetchMemberDataByUuidResponse } from "./AdminApi";
import { AdminInterface } from "./AdminInterface";
import { MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { RoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
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
        const matched = playUri.match('/[_@*]/.+/.+/');
        return Promise.resolve({
            email: userIdentifier,
            userUuid: userIdentifier,
            tags: [],
            messages: [],
            visitCardUrl: null,
            textures: [],
            userRoomToken: undefined,
            mucRooms: [{name: 'Default Room', uri: matched?.join().substring(0, -1)}]
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
            authenticationMandatory: DISABLE_ANONYMOUS,
            contactPage: null,
            mucRooms: null,
            group: null,
            iframeAuthentication: null,
            loadingLogo: null,
            loginSceneLogo: null,
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
