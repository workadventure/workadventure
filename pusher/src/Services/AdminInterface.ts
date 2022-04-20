import { AdminBannedData, FetchMemberDataByUuidResponse } from "./AdminApi";
import { MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { RoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
import { AdminApiData } from "../Messages/JsonMessages/AdminApiData";

export interface AdminInterface {

    /**
     * @var playUri: is url of the room
     * @var userIdentifier: can to be undefined or email or uuid
     * @var ipAddress
     * @var characterLayers
     * @return MapDetailsData|RoomRedirect
     */
    fetchMemberDataByUuid(
        locale: string,
        userIdentifier: string,
        playUri: string,
        ipAddress: string,
        characterLayers: string[]
    ): Promise<FetchMemberDataByUuidResponse>;

    /**
     * @var playUri: is url of the room
     * @var userId: can to be undefined or email or uuid
     * @return MapDetailsData|RoomRedirect
     */
    fetchMapDetails(locale: string, playUri: string, authToken?: string): Promise<MapDetailsData | RoomRedirect>;

    /**
     * @param locale
     * @param organizationMemberToken
     * @param playUri
     * @return AdminApiData
     */
    fetchMemberDataByToken(locale: string, organizationMemberToken: string, playUri: string | null): Promise<AdminApiData>;

    /**
     * @param locale
     * @param reportedUserUuid
     * @param reportedUserComment
     * @param reporterUserUuid
     * @param reportWorldSlug
     */
    reportPlayer(
        locale: string,
        reportedUserUuid: string,
        reportedUserComment: string,
        reporterUserUuid: string,
        reportWorldSlug: string
    ): Promise<unknown>;

    /**
     * @param locale
     * @param userUuid
     * @param ipAddress
     * @param roomUrl
     * @return AdminBannedData
     */
    verifyBanUser(locale: string, userUuid: string, ipAddress: string, roomUrl: string): Promise<AdminBannedData>;

    /**
     * @param locale
     * @param roomUrl
     * @return string[]
     */
    getUrlRoomsFromSameWorld(locale: string, roomUrl: string): Promise<string[]>;

    /**
     * @param accessToken
     * @return string
     */
    getProfileUrl(accessToken: string): string;

    /**
     * @param token
     */
    logoutOauth(token: string): Promise<void>;
}
