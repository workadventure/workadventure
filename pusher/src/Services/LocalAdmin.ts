import {FetchMemberDataByUuidResponse} from "./AdminApi";
import {AdminInterface} from "./AdminInterface";
import {MapDetailsData} from "../Messages/JsonMessages/MapDetailsData";
import {RoomRedirect} from "../Messages/JsonMessages/RoomRedirect";
import {GameRoomPolicyTypes} from "../Model/PusherRoom";
import {DISABLE_ANONYMOUS} from "../Enum/EnvironmentVariable";

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
        characterLayers: string[]
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
        userId?: string
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
            loginSceneLogo: null
        });
    }
}

export const localAdmin = new LocalAdmin();
