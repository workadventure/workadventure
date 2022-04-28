import {generateSchema} from "@anatine/zod-openapi";
import {isAdminApiData} from "../Messages/JsonMessages/AdminApiData";
import {
    isErrorApiErrorData,
    isErrorApiRedirectData,
    isErrorApiRetryData,
    isErrorApiUnauthorizedData
} from "../Messages/JsonMessages/ErrorApiData";
import {isMapDetailsData} from "../Messages/JsonMessages/MapDetailsData";
import {isRegisterData} from "../Messages/JsonMessages/RegisterData";
import {isRoomRedirect} from "../Messages/JsonMessages/RoomRedirect";
import {isFetchMemberDataByUuidResponse} from "./AdminApi";
import {
    isBanBannedAdminMessageInterface, isListenRoomsMessageInterface,
    isUserMessageAdminMessageInterface
} from "../Model/Websocket/Admin/AdminMessages";
import {isWokaDetail} from "../Messages/JsonMessages/PlayerTextures";

class SwaggerGenerator {
    definitions() {
        return {
            definitions:
                {
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
                }
        };
    }
}

export default new SwaggerGenerator();
