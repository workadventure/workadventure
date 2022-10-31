import type { AdminBannedData, FetchMemberDataByUuidResponse } from "./AdminApi";
import type { AdminInterface } from "./AdminInterface";
import type { MapDetailsData, RoomRedirect, AdminApiData } from "@workadventure/messages";
import {
    DISABLE_ANONYMOUS,
    ENABLE_CHAT,
    ENABLE_CHAT_UPLOAD,
    PUBLIC_MAP_STORAGE_URL,
    START_ROOM_URL,
} from "../enums/EnvironmentVariable";
import { localWokaService } from "./LocalWokaService";
import { MetaTagsDefaultValue } from "./MetaTagsBuilder";
import type { ErrorApiData } from "../../messages/JsonMessages/ErrorApiData";

/**
 * A local class mocking a real admin if no admin is configured.
 */
class LocalAdmin implements AdminInterface {
    async fetchMemberDataByUuid(
        userIdentifier: string,
        accessToken: string | undefined,
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

    fetchMapDetails(
        playUri: string,
        authToken?: string,
        locale?: string
    ): Promise<MapDetailsData | RoomRedirect | ErrorApiData> {
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
                return Promise.resolve({
                    type: "error",
                    code: "UNSUPPORTED_URL_FORMAT",
                    title: "Unsupported URL format",
                    details: "Unsupported path: " + roomUrl.pathname,
                    image: "",
                    subtitle: "",
                });
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
            opidLogoutRedirectUrl: null,
            miniLogo: null,
            loadingLogo: null,
            loginSceneLogo: null,
            showPoweredBy: true,
            loadingCowebsiteLogo: null,
            enableChat: ENABLE_CHAT,
            enableChatUpload: ENABLE_CHAT_UPLOAD,
            metatags: {
                ...MetaTagsDefaultValue,
            },
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
