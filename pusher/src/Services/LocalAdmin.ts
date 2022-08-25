import { AdminBannedData, FetchMemberDataByUuidResponse } from "./AdminApi";
import { AdminInterface } from "./AdminInterface";
import { MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { RoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
import { DISABLE_ANONYMOUS, PUBLIC_MAP_STORAGE_URL, START_ROOM_URL } from "../Enum/EnvironmentVariable";
import { AdminApiData } from "../Messages/JsonMessages/AdminApiData";
import { localWokaService } from "./LocalWokaService";

/**
 * A local class mocking a real admin if no admin is configured.
 */
class LocalAdmin implements AdminInterface {
    async fetchMemberDataByUuid(
        userIdentifier: string,
        isLogged: boolean,
        playUri: string,
        ipAddress: string,
        characterLayers: string[],
        locale?: string
    ): Promise<FetchMemberDataByUuidResponse> {
        return {
            email: userIdentifier,
            userUuid: userIdentifier,
            tags: [],
            messages: [],
            visitCardUrl: null,
            textures: (await localWokaService.fetchWokaDetails(characterLayers)) ?? [],
            userRoomToken: undefined,
            mucRooms: [{ name: "Connected users", url: playUri, type: "default", subscribe: false }],
            activatedInviteUser: true,
        };
    }

    fetchMapDetails(playUri: string, authToken?: string, locale?: string): Promise<MapDetailsData | RoomRedirect> {
        const roomUrl = new URL(playUri);

        if (roomUrl.pathname === "/") {
            roomUrl.pathname = START_ROOM_URL;
            return Promise.resolve({
                redirectUrl: roomUrl.toString(),
            });
        }

        let mapUrl = "";
        let canEdit = false;
        let match = /\/~\/(.+)/.exec(roomUrl.pathname);
        if (match) {
            mapUrl = `${PUBLIC_MAP_STORAGE_URL}/${match[1]}`;
            canEdit = true;
        } else {
            match = /\/_\/[^/]+\/(.+)/.exec(roomUrl.pathname);
            if (!match) {
                throw new Error("URL format is not good : " + roomUrl.pathname);
            }
            mapUrl = roomUrl.protocol + "//" + match[1];
        }

        return Promise.resolve({
            mapUrl,
            canEdit,
            authenticationMandatory: DISABLE_ANONYMOUS,
            contactPage: null,
            mucRooms: null,
            group: null,
            iframeAuthentication: null,
            miniLogo: null,
            loadingLogo: null,
            loginSceneLogo: null,
            showPoweredBy: true,
            loadingCowebsiteLogo: null,
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
        roomUrl: string,
        locale?: string
    ): Promise<unknown> {
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

    getProfileUrl(accessToken: string, playUri: string): string {
        new Error("No admin backoffice set!");
        return "";
    }

    async logoutOauth(token: string): Promise<void> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    banUserByUuid(
        uuidToBan: string,
        playUri: string,
        name: string,
        message: string,
        byUserEmail: string
    ): Promise<boolean> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }
}

export const localAdmin = new LocalAdmin();
