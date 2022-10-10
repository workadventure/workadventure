import { generateSchema } from "@anatine/zod-openapi";
import {
    isAdminApiData,
    isErrorApiErrorData,
    isErrorApiRedirectData,
    isErrorApiRetryData,
    isErrorApiUnauthorizedData,
    isMapDetailsData,
    isWokaDetail,
    wokaList,
    wokaTexture,
    isRoomRedirect,
} from "@workadventure/messages";
import { isFetchMemberDataByUuidResponse } from "./AdminApi";
import type { SchemaObject } from "openapi3-ts";
import { isRoomRedirect } from "../../messages/JsonMessages/RoomRedirect";
import {
    companionCollectionList,
    companionTextureCollection,
    isCompanionDetail
} from "../../messages/JsonMessages/CompanionTextures";
import {isCapabilities} from "../../messages/JsonMessages/CapabilitiesData";

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
                WokaDetail: generateSchema(isWokaDetail)
            },
        };
        if (type === "external") {
            return definitions;
        }
        return {
            definitions: {
                AdminApiData: generateSchema(isAdminApiData),
                //BanBannedAdminMessageInterface: generateSchema(isBanBannedAdminMessageInterface),
                Capabilities: generateSchema(isCapabilities),
                CompanionCollectionList: generateSchema(companionCollectionList),
                CompanionDetail: generateSchema(isCompanionDetail),
                CompanionCollection: generateSchema(companionTextureCollection),
                ErrorApiErrorData: generateSchema(isErrorApiErrorData),
                ErrorApiRedirectData: generateSchema(isErrorApiRedirectData),
                ErrorApiRetryData: generateSchema(isErrorApiRetryData),
                ErrorApiUnauthorizedData: generateSchema(isErrorApiUnauthorizedData),
                FetchMemberDataByUuidResponse: generateSchema(isFetchMemberDataByUuidResponse),
                //ListenRoomsMessageInterface: generateSchema(isListenRoomsMessageInterface),
                MapDetailsData: generateSchema(isMapDetailsData),
                RoomRedirect: generateSchema(isRoomRedirect),
                //RegisterData: generateSchema(isRegisterData),
                //RoomRedirect: generateSchema(isRoomRedirect),
                //UserMessageAdminMessageInterface: generateSchema(isUserMessageAdminMessageInterface),
                WokaDetail: generateSchema(isWokaDetail),
                WokaList: generateSchema(wokaList),
                WokaTexture: generateSchema(wokaTexture),
            },
        };
    }
}

export default new SwaggerGenerator();
