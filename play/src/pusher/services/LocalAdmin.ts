import path from "path";
import type {
    AdminApiData,
    CompanionDetail,
    ErrorApiData,
    MapDetailsData,
    MemberData,
    OauthRefreshToken,
    RoomRedirect,
} from "@workadventure/messages";
import { Capabilities, OpidWokaNamePolicy } from "@workadventure/messages";
import axios from "axios";
import { MapsCacheFileFormat } from "@workadventure/map-editor";
import {
    CARDS_ENABLED,
    DISABLE_ANONYMOUS,
    ENABLE_CHAT,
    ENABLE_CHAT_DISCONNECTED_LIST,
    ENABLE_CHAT_ONLINE_LIST,
    ENABLE_CHAT_UPLOAD,
    ENABLE_MAP_EDITOR,
    ENABLE_SAY,
    ERASER_ENABLED,
    EXCALIDRAW_ENABLED,
    GOOGLE_DOCS_ENABLED,
    GOOGLE_DRIVE_ENABLED,
    GOOGLE_SHEETS_ENABLED,
    GOOGLE_SLIDES_ENABLED,
    INTERNAL_MAP_STORAGE_URL,
    KLAXOON_ENABLED,
    MAP_EDITOR_ALLOW_ALL_USERS,
    MAP_EDITOR_ALLOWED_USERS,
    OPID_WOKA_NAME_POLICY,
    PUBLIC_MAP_STORAGE_URL,
    START_ROOM_URL,
    YOUTUBE_ENABLED,
    MATRIX_PUBLIC_URI,
    MATRIX_API_URI,
    MATRIX_ADMIN_USER,
    MATRIX_ADMIN_PASSWORD,
    MATRIX_DOMAIN,
} from "../enums/EnvironmentVariable";
import type { AdminInterface } from "./AdminInterface";
import type { AdminBannedData, FetchMemberDataByUuidResponse } from "./AdminApi";
import { localWokaService } from "./LocalWokaService";
import { MetaTagsDefaultValue } from "./MetaTagsBuilder";
import { localCompanionService } from "./LocalCompanionSevice";
import { ShortMapDescription, ShortMapDescriptionList } from "./ShortMapDescription";
import { WorldChatMembersData } from "./WorldChatMembersData";
// import {LIVEKIT_API_KEY} from "workadventureback/src/Enum/EnvironmentVariable";

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
        locale?: string,
        tags?: string[]
    ): Promise<FetchMemberDataByUuidResponse> {
        let canEdit = false;
        let canRecord = false;
        const roomUrl = new URL(playUri);
        const match = /\/~\/(.+)/.exec(roomUrl.pathname);
        if (
            match &&
            ENABLE_MAP_EDITOR &&
            (MAP_EDITOR_ALLOW_ALL_USERS ||
                MAP_EDITOR_ALLOWED_USERS.includes(userIdentifier) ||
                tags?.includes("admin") ||
                tags?.includes("editor"))
        ) {
            canEdit = true;
        }

        let isCharacterTexturesValid = true;

        const characterTextures = await localWokaService.fetchWokaDetails(characterTextureIds);
        if (characterTextures === undefined) {
            isCharacterTexturesValid = false;
        }

        let isCompanionTextureValid = true;
        let companionTexture: CompanionDetail | undefined = undefined;
        if (companionTextureId) {
            companionTexture = await localCompanionService.fetchCompanionDetails(companionTextureId);
            if (companionTexture === undefined) {
                isCompanionTextureValid = false;
            }
        }

        const applications = [];
        if (KLAXOON_ENABLED) {
            applications.push({
                name: "Klaxoon",
                doc: "https://klaxoon.com",
                image: "https://static.klaxoon.com/favicon.ico",
                description: "Klaxoon (Brainstorming, Quiz, Survey)",
                enabled: true,
                default: true,
                forceNewTab: false,
                allowAPI: false,
            });
        }
        if (YOUTUBE_ENABLED) {
            applications.push({
                name: "Youtube",
                doc: "https://youtube.com",
                image: "https://www.youtube.com/favicon.ico",
                description: "Youtube (Video sharing)",
                enabled: true,
                default: true,
                forceNewTab: false,
                allowAPI: false,
            });
        }
        if (GOOGLE_DRIVE_ENABLED) {
            applications.push({
                name: "Google Drive",
                doc: "https://drive.google.com",
                description: "Google Drive (Docs, Sheets, Slides)",
                enabled: true,
                default: true,
                forceNewTab: false,
                allowAPI: false,
            });
        }
        if (GOOGLE_DOCS_ENABLED) {
            applications.push({
                name: "Google Docs",
                doc: "https://docs.google.com",
                description: "Google Docs (Word Processor)",
                enabled: true,
                default: true,
                forceNewTab: false,
                allowAPI: false,
            });
        }
        if (GOOGLE_SHEETS_ENABLED) {
            applications.push({
                name: "Google Sheets",
                doc: "https://sheets.google.com",
                description: "Google Sheets (Spreadsheet)",
                enabled: true,
                default: true,
                forceNewTab: false,
                allowAPI: false,
            });
        }
        if (GOOGLE_SLIDES_ENABLED) {
            applications.push({
                name: "Google Slides",
                doc: "https://slides.google.com",
                description: "Google Slides (Presentation)",
                enabled: true,
                default: true,
                forceNewTab: false,
                allowAPI: false,
            });
        }
        if (ERASER_ENABLED) {
            applications.push({
                name: "Eraser",
                doc: "https://workadventu.re",
                description: "Eraser (White board)",
                enabled: true,
                default: true,
                forceNewTab: false,
                allowAPI: false,
            });
        }
        if (EXCALIDRAW_ENABLED) {
            applications.push({
                name: "Excalidraw",
                doc: "https://excalidraw.com",
                description: "Excalidraw (White board)",
                enabled: true,
                default: true,
                forceNewTab: false,
                allowAPI: false,
            });
        }
        if (CARDS_ENABLED) {
            applications.push({
                name: "Cards",
                doc: "https://workadventu.re",
                description: "Cards (learning tool)",
                enabled: true,
                default: true,
                forceNewTab: false,
                allowAPI: false,
            });
        }
        // TODO: Make a better check for the livekit and S3 configuration
        canRecord = true;

        return {
            status: "ok",
            email: userIdentifier,
            userUuid: userIdentifier,
            tags: tags ?? [],
            messages: [],
            visitCardUrl: null,
            isCharacterTexturesValid,
            characterTextures: characterTextures ?? [],
            isCompanionTextureValid,
            companionTexture,
            userRoomToken: undefined,
            activatedInviteUser: true,
            canEdit,
            world: "localWorld",
            applications,
            canRecord,
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
        let canEdit = false;

        let match = /\/~\/(.+)/.exec(roomUrl.pathname);
        if (match) {
            if (path.extname(roomUrl.pathname) === ".tmj") {
                return Promise.resolve({
                    redirectUrl: roomUrl.toString().replace(".tmj", ".wam"),
                });
            }
            wamUrl = `${PUBLIC_MAP_STORAGE_URL}/${match[1]}`;
            canEdit = ENABLE_MAP_EDITOR;
        } else {
            match = /\/_\/[^/]+\/(.+)/.exec(roomUrl.pathname);
            if (!match) {
                return Promise.resolve({
                    status: "error",
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
            group: wamUrl ? "default" : null,
            opidLogoutRedirectUrl: null,
            opidUsernamePolicy: opidWokaNamePolicyCheck.success ? opidWokaNamePolicyCheck.data : null,
            loadingLogo: null,
            loginSceneLogo: null,
            errorSceneLogo: null,
            showPoweredBy: true,
            loadingCowebsiteLogo: null,
            enableChat: ENABLE_CHAT,
            enableChatUpload: ENABLE_CHAT_UPLOAD,
            enableChatOnlineList: ENABLE_CHAT_ONLINE_LIST,
            enableChatDisconnectedList: ENABLE_CHAT_DISCONNECTED_LIST,
            enableSay: ENABLE_SAY,
            enableMatrixChat: Boolean(
                MATRIX_PUBLIC_URI && MATRIX_API_URI && MATRIX_ADMIN_USER && MATRIX_ADMIN_PASSWORD && MATRIX_DOMAIN
            ),
            metatags: {
                ...MetaTagsDefaultValue,
            },
            metadata: {
                room: {
                    isPremium: true,
                    enableRecord: true,
                },
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

    async getUrlRoomsFromSameWorld(roomUrl: string, locale?: string): Promise<ShortMapDescriptionList> {
        const url = new URL(roomUrl);
        const match = /\/~\/(.+)/.exec(url.pathname);
        if (match) {
            //let wamUrl = `${PUBLIC_MAP_STORAGE_URL}/${match[1]}`;
            const response = await axios.get(`${INTERNAL_MAP_STORAGE_URL}/maps`);
            const maps = MapsCacheFileFormat.parse(response.data);

            const mapDescriptions: ShortMapDescription[] = [];
            for (const [path, value] of Object.entries(maps.maps)) {
                let publicMapStorageUrl = PUBLIC_MAP_STORAGE_URL;
                if (!publicMapStorageUrl.endsWith("/")) {
                    publicMapStorageUrl += "/";
                }
                const wamUrl = new URL(path, publicMapStorageUrl).toString();
                const name = value?.metadata?.name ?? path;
                mapDescriptions.push({
                    name,
                    roomUrl: "/~/" + path,
                    wamUrl,
                    ...value?.metadata,
                });
            }
            return mapDescriptions;
        }

        return Promise.reject(new Error("No admin backoffice set!"));
    }

    getProfileUrl(accessToken: string, playUri: string): string {
        return `/profile?accessToken=${accessToken}&playUri=${playUri}`;
    }

    async logoutOauth(token: string): Promise<void> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    banUserByUuid(
        uuidToBan: string,
        playUri: string,
        name: string,
        message: string,
        byUserUuid: string
    ): Promise<boolean> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    getTagsList(roomUrl: string): Promise<string[]> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    saveName(userIdentifier: string, name: string, roomUrl: string): Promise<void> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    saveTextures(userIdentifier: string, textures: string[], roomUrl: string): Promise<void> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    saveCompanionTexture(userIdentifier: string, texture: string | null, roomUrl: string): Promise<void> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    public getCapabilities(): Promise<Capabilities> {
        return Promise.resolve({
            "api/woka/list": "v1",
            "api/companion/list": "v1",
        });
    }

    searchMembers(roomUrl: string, searchText: string): Promise<MemberData[]> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    getMember(memberUUID: string): Promise<MemberData> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }

    searchTags(roomUrl: string, searchText: string): Promise<string[]> {
        return Promise.resolve([]);
    }

    getWorldChatMembers(playUri: string, searchText: string): Promise<WorldChatMembersData> {
        return Promise.resolve({
            members: [],
            total: 0,
        });
    }

    updateChatId(userIdentifier: string, chatId: string): Promise<void> {
        return Promise.resolve();
    }

    refreshOauthToken(token: string): Promise<OauthRefreshToken> {
        return Promise.reject(new Error("No admin backoffice set!"));
    }
}

export const localAdmin = new LocalAdmin();
