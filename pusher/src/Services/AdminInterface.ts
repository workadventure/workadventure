import { AdminBannedData, FetchMemberDataByAuthTokenResponse } from "./AdminApi";
import { MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { RoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
import { ErrorApiData } from "../Messages/JsonMessages/ErrorApiData";
import { AdminApiData } from "../Messages/JsonMessages/AdminApiData";

export interface AdminInterface {
    /**
     * @var authToken: JWT token
     * @var authTokenData: Object of JWT token
     * @var playUri: Url of the room
     * @var ipAddress
     * @var characterLayers
     * @return MapDetailsData|RoomRedirect
     */
    fetchMemberDataByAuthToken(
        authToken: string,
        playUri: string,
        ipAddress: string,
        characterLayers: string[],
        locale?: string
    ): Promise<FetchMemberDataByAuthTokenResponse | (ErrorApiData & { httpCode: number })>;

    /**
     * @var playUri: Url of the room
     * @var authToken: Can to be email or uuid
     * @return MapDetailsData|RoomRedirect
     */
    fetchMapDetails(
        playUri: string,
        authToken?: string,
        locale?: string
    ): Promise<MapDetailsData | RoomRedirect | ErrorApiData>;

    /**
     * @param locale
     * @param authToken
     * @param playUri
     * @return AdminApiData
     */
    fetchLoginData(authToken: string, playUri: string | null, locale?: string): Promise<AdminApiData>;

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
    getUrlRoomsFromSameWorld(roomUrl: string, locale?: string): Promise<string[]>;

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
        byUserEmail: string
    ): Promise<boolean>;
}
