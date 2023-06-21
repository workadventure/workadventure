import path from "path";
import type { MapDetailsData, RoomRedirect, AdminApiData, ErrorApiData } from "@workadventure/messages";
import { OpidWokaNamePolicy } from "@workadventure/messages";
import {
    DISABLE_ANONYMOUS,
    ENABLE_CHAT,
    ENABLE_CHAT_UPLOAD,
    ENABLE_MAP_EDITOR,
    PUBLIC_MAP_STORAGE_URL,
    START_ROOM_URL,
    OPID_WOKA_NAME_POLICY,
    ENABLE_CHAT_ONLINE_LIST,
    ENABLE_CHAT_DISCONNECTED_LIST,
    MAP_EDITOR_ALLOWED_USERS,
} from "../enums/EnvironmentVariable";
import type { AdminInterface } from "./AdminInterface";
import type { AdminBannedData, FetchMemberDataByUuidResponse } from "./AdminApi";
import { localWokaService } from "./LocalWokaService";
import { MetaTagsDefaultValue } from "./MetaTagsBuilder";
import { localCompanionService } from "./LocalCompanionSevice";

/**
 * A local class mocking a real admin if no admin is configured.
 */
class LocalAdmin implements AdminInterface {
    async fetchMemberDataByUuid(
        userIdentifier: string,
        accessToken: string | undefined,
        playUri: string,
        ipAddress: string,
        characterTextureIds: string[],
        companionTextureId?: string,
        locale?: string
    ): Promise<FetchMemberDataByUuidResponse> {
        let canEdit = false;
        const roomUrl = new URL(playUri);
        const match = /\/~\/(.+)/.exec(roomUrl.pathname);

        if (
            match &&
            ENABLE_MAP_EDITOR &&
            (MAP_EDITOR_ALLOWED_USERS.length === 0 || MAP_EDITOR_ALLOWED_USERS.includes(userIdentifier))
        ) {
            canEdit = true;
        }

        const mucRooms = [{ name: "Connected users", url: playUri, type: "default", subscribe: false }];
        if (ENABLE_CHAT) {
            mucRooms.push({ name: "Welcome", url: `${playUri}/forum/welcome`, type: "forum", subscribe: false });
        }
        return {
            email: userIdentifier,
            userUuid: userIdentifier,
            tags: [],
            messages: [],
            visitCardUrl: null,
            characterTextures: (await localWokaService.fetchWokaDetails(characterTextureIds)) ?? [],
            companionTexture: companionTextureId
                ? await localCompanionService.fetchCompanionDetails(companionTextureId)
                : undefined,
            userRoomToken: undefined,
            mucRooms,
            activatedInviteUser: true,
            canEdit,
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

        let mapUrl = undefined;
        let wamUrl = undefined;
        const canEdit = ENABLE_MAP_EDITOR;

        let match = /\/~\/(.+)/.exec(roomUrl.pathname);
        if (match) {
            if (path.extname(roomUrl.pathname) === ".tmj") {
                return Promise.resolve({
                    redirectUrl: roomUrl.toString().replace(".tmj", ".wam"),
                });
            }
            wamUrl = `${PUBLIC_MAP_STORAGE_URL}/${match[1]}`;
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

        const opidWokaNamePolicyCheck = OpidWokaNamePolicy.safeParse(OPID_WOKA_NAME_POLICY);

        return Promise.resolve({
            mapUrl,
            wamUrl,
            canEdit,
            authenticationMandatory: DISABLE_ANONYMOUS,
            contactPage: null,
            mucRooms: null,
            group: null,
            iframeAuthentication: null,
            opidLogoutRedirectUrl: null,
            opidUsernamePolicy: opidWokaNamePolicyCheck.success ? opidWokaNamePolicyCheck.data : null,
            miniLogo: null,
            loadingLogo: null,
            loginSceneLogo: null,
            showPoweredBy: true,
            loadingCowebsiteLogo: null,
            enableChat: ENABLE_CHAT,
            enableChatUpload: ENABLE_CHAT_UPLOAD,
            enableChatOnlineList: ENABLE_CHAT_ONLINE_LIST,
            enableChatDisconnectedList: ENABLE_CHAT_DISCONNECTED_LIST,
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

    fetchWellKnownChallenge(host: string): Promise<string> {
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

    getTagsList(roomUrl: string): Promise<string[]> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }
}

export const localAdmin = new LocalAdmin();
