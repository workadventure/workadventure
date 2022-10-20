import { generateSchema } from "@anatine/zod-openapi";
import { isAdminApiData } from "../Messages/JsonMessages/AdminApiData";
import {
    isErrorApiErrorData,
    isErrorApiRedirectData,
    isErrorApiRetryData,
    isErrorApiUnauthorizedData,
} from "../Messages/JsonMessages/ErrorApiData";
import { isMapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { isFetchMemberDataByUuidResponse } from "./AdminApi";
import { isWokaDetail, wokaList, wokaTexture } from "../Messages/JsonMessages/PlayerTextures";
import { SchemaObject } from "openapi3-ts";
import { isRoomRedirect } from "../Messages/JsonMessages/RoomRedirect";

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
