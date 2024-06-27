import { generateSchema } from "@anatine/zod-openapi";
import {
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
import type { SchemaObject } from "openapi3-ts";
import { isFetchMemberDataByUuidResponse } from "./AdminApi";
import { WorldChatMembersData } from "./WorldChatMembersData";

class SwaggerGenerator {
    definitions(type: string | null): {
        definitions: { [K: string]: SchemaObject };
    } {
        const definitions = {
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
        if (type === "external") {
            return definitions;
        }
        return {
            definitions: {
                AdminApiData: generateSchema(isAdminApiData),
                Capabilities: generateSchema(isCapabilities),
                CompanionTextureCollectionList: generateSchema(CompanionTextureCollection.array()),
                CompanionDetail: generateSchema(CompanionDetail),
                CompanionTextureCollection: generateSchema(CompanionTextureCollection),
                ErrorApiErrorData: generateSchema(isErrorApiErrorData),
                ErrorApiRedirectData: generateSchema(isErrorApiRedirectData),
                ErrorApiRetryData: generateSchema(isErrorApiRetryData),
                ErrorApiUnauthorizedData: generateSchema(isErrorApiUnauthorizedData),
                FetchMemberDataByUuidResponse: generateSchema(isFetchMemberDataByUuidResponse),
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
