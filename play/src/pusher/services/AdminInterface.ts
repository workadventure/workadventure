import type {
    AdminApiData,
    ErrorApiData,
    MapDetailsData,
    MemberData,
    OauthRefreshToken,
    RoomRedirect,
} from "@workadventure/messages";
import { Capabilities } from "@workadventure/messages";
import { AdminBannedData, FetchMemberDataByUuidResponse } from "./AdminApi";
import { ShortMapDescriptionList } from "./ShortMapDescription";
import { WorldChatMembersData } from "./WorldChatMembersData";

export interface AdminInterface {
    /**
     * @var playUri is url of the room
     * @var userIdentifier can to be undefined or email or uuid
     * @var ipAddress
     * @var characterTextures
     * @return MapDetailsData|RoomRedirect
     */
    fetchMemberDataByUuid(
        userIdentifier: string,
        accessToken: string | undefined,
        playUri: string,
        ipAddress: string,
        characterTextureIds: string[],
        companionTextureId?: string,
        locale?: string,
        tags?: string[],
        chatID?: string
    ): Promise<FetchMemberDataByUuidResponse>;

    /**
     * @var playUri is url of the room
     * @var userId can to be undefined or email or uuid
     * @return MapDetailsData|RoomRedirect
     */
    fetchMapDetails(
        playUri: string,
        authToken?: string,
        locale?: string
    ): Promise<MapDetailsData | RoomRedirect | ErrorApiData>;

    /**
     * @param locale
     * @param organizationMemberToken
     * @param playUri
     * @return AdminApiData
     */
    fetchMemberDataByToken(
        organizationMemberToken: string,
        playUri: string | null,
        locale?: string
    ): Promise<AdminApiData>;

    /**
     * @var host Request hostname
     * @return string
     */
    fetchWellKnownChallenge(host: string): Promise<string>;

    /**
     * @param locale
     * @param reportedUserUuid
     * @param reportedUserComment
     * @param reporterUserUuid
     * @param roomUrl
     */
    reportPlayer(
        reportedUserUuid: string,
        reportedUserComment: string,
        reporterUserUuid: string,
        roomUrl: string,
        locale?: string
    ): Promise<unknown>;

    /**
     * @param locale
     * @param userUuid
     * @param ipAddress
     * @param roomUrl
     * @return AdminBannedData
     */
    verifyBanUser(userUuid: string, ipAddress: string, roomUrl: string, locale?: string): Promise<AdminBannedData>;

    /**
     * @param locale
     * @param roomUrl
     * @return string[]
     */
    getUrlRoomsFromSameWorld(
        roomUrl: string,
        locale?: string,
        tags?: string[],
        bypassTagFilter?: boolean
    ): Promise<ShortMapDescriptionList>;

    /**
     * @param accessToken
     * @param playUri
     * @return string
     */
    getProfileUrl(accessToken: string, playUri: string): string;

    /**
     * @param token
     */
    logoutOauth(token: string): Promise<void>;

    banUserByUuid(
        uuidToBan: string,
        playUri: string,
        name: string,
        message: string,
        byUserUuid: string
    ): Promise<boolean>;

    getTagsList(roomUrl: string): Promise<string[]>;

    /**
     * Saves the name of the user in the (admin) database
     */
    saveName(userIdentifier: string, name: string, roomUrl: string): Promise<void>;

    saveTextures(userIdentifier: string, textures: string[], roomUrl: string): Promise<void>;

    saveCompanionTexture(userIdentifier: string, texture: string | null, roomUrl: string): Promise<void>;

    getCapabilities(): Promise<Capabilities>;

    searchMembers(roomUrl: string, searchText: string): Promise<MemberData[]>;

    searchTags(world: string, searchText: string): Promise<string[]>;

    getMember(memberUUID: string): Promise<MemberData>;

    getWorldChatMembers(playUri: string, searchText: string): Promise<WorldChatMembersData>;

    updateChatId(userIdentifier: string, chatId: string, roomUrl: string): Promise<void>;

    refreshOauthToken(token: string): Promise<OauthRefreshToken>;
}
