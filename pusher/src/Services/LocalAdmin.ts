import { FetchMemberDataByUuidResponse } from "./AdminApi";
import { AdminInterface } from "./AdminInterface";

/**
 * A local class mocking a real admin if no admin is configured.
 */
class LocalAdmin implements AdminInterface {
    fetchMemberDataByUuid(
        userIdentifier: string,
        playUri: string,
        ipAddress: string,
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
}

export const localAdmin = new LocalAdmin();
