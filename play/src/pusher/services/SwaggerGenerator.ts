import { generateSchema } from "@anatine/zod-openapi";
import {
    analyticsEvent,
    analyticsEventsBatch,
    isAdminApiData,
    isErrorApiErrorData,
    isErrorApiRedirectData,
    isErrorApiRetryData,
    isErrorApiUnauthorizedData,
    isMapDetailsData,
    WokaDetail,
    wokaList,
    wokaTexture,
    isRoomRedirect,
    CompanionTextureCollection,
    CompanionDetail,
    isCapabilities,
} from "@workadventure/messages";
import type { SchemaObject } from "openapi3-ts/oas31";
import { isFetchMemberDataByUuidResponse } from "./AdminApi";
import { WorldChatMembersData } from "./WorldChatMembersData";
import { IceServer } from "./IceServer";

class SwaggerGenerator {
    definitions(type: string | null): {
        definitions: { [K: string]: SchemaObject };
    } {
        if (type === "external") {
            return {
                definitions: {
                    AdminApiData: generateSchema(isAdminApiData),
                    ErrorApiUnauthorizedData: generateSchema(isErrorApiUnauthorizedData),
                    FetchMemberDataByUuidResponse: generateSchema(isFetchMemberDataByUuidResponse),
                    MapDetailsData: generateSchema(isMapDetailsData),
                    RoomRedirect: generateSchema(isRoomRedirect),
                    WokaDetail: generateSchema(WokaDetail),
                    WorldChatMembersData: generateSchema(WorldChatMembersData),
                },
            };
        }
        return {
            definitions: {
                AdminApiData: generateSchema(isAdminApiData),
                // The union, not its 166 members: @anatine/zod-openapi renders a
                // ZodDiscriminatedUnion as one `oneOf` + `discriminator` node, whereas
                // registering members one by one (as ErrorApiData does, with four)
                // would put 166 definitions at the top level.
                AnalyticsEvent: generateSchema(analyticsEvent),
                AnalyticsEventsBatch: generateSchema(analyticsEventsBatch),
                Capabilities: generateSchema(isCapabilities),
                CompanionTextureCollectionList: generateSchema(CompanionTextureCollection.array()),
                CompanionDetail: generateSchema(CompanionDetail),
                CompanionTextureCollection: generateSchema(CompanionTextureCollection),
                ErrorApiErrorData: generateSchema(isErrorApiErrorData),
                ErrorApiRedirectData: generateSchema(isErrorApiRedirectData),
                ErrorApiRetryData: generateSchema(isErrorApiRetryData),
                ErrorApiUnauthorizedData: generateSchema(isErrorApiUnauthorizedData),
                FetchMemberDataByUuidResponse: generateSchema(isFetchMemberDataByUuidResponse),
                IceServer: generateSchema(IceServer),
                MapDetailsData: generateSchema(isMapDetailsData),
                RoomRedirect: generateSchema(isRoomRedirect),
                WokaDetail: generateSchema(WokaDetail),
                WokaList: generateSchema(wokaList),
                WokaTexture: generateSchema(wokaTexture),
                WorldChatMembersData: generateSchema(WorldChatMembersData),
            },
        };
    }
}

export default new SwaggerGenerator();
