import { FetchMemberDataByUuidResponse } from "./AdminApi";

export interface AdminInterface {
    fetchMemberDataByUuid(
        userIdentifier: string,
        playUri: string,
        ipAddress: string,
        characterLayers: string[]
    ): Promise<FetchMemberDataByUuidResponse>;
}
