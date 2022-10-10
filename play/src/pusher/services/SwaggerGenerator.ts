import { generateSchema } from "@anatine/zod-openapi";
import { isAdminApiData } from "../../messages/JsonMessages/AdminApiData";
import {
    isErrorApiErrorData,
    isErrorApiRedirectData,
    isErrorApiRetryData,
    isErrorApiUnauthorizedData,
} from "../../messages/JsonMessages/ErrorApiData";
import { isMapDetailsData } from "../../messages/JsonMessages/MapDetailsData";
import { isFetchMemberDataByUuidResponse } from "./AdminApi";
import { isWokaDetail, wokaList, wokaTexture } from "../../messages/JsonMessages/PlayerTextures";
import type { SchemaObject } from "openapi3-ts";

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
                WokaDetail: generateSchema(isWokaDetail),
            },
        };
        if (type === "external") {
            return definitions;
        }
        return {
            definitions: {
                AdminApiData: generateSchema(isAdminApiData),
                //BanBannedAdminMessageInterface: generateSchema(isBanBannedAdminMessageInterface),
                ErrorApiErrorData: generateSchema(isErrorApiErrorData),
                ErrorApiRedirectData: generateSchema(isErrorApiRedirectData),
                ErrorApiRetryData: generateSchema(isErrorApiRetryData),
                ErrorApiUnauthorizedData: generateSchema(isErrorApiUnauthorizedData),
                FetchMemberDataByUuidResponse: generateSchema(isFetchMemberDataByUuidResponse),
                //ListenRoomsMessageInterface: generateSchema(isListenRoomsMessageInterface),
                MapDetailsData: generateSchema(isMapDetailsData),
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
