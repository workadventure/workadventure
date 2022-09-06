import { generateSchema } from "@anatine/zod-openapi";
import { isAdminApiLoginUrlData } from "../Messages/JsonMessages/AdminApiLoginUrlData";
import {
    isErrorApiErrorData,
    isErrorApiRedirectData,
    isErrorApiRetryData,
    isErrorApiUnauthorizedData,
} from "../Messages/JsonMessages/ErrorApiData";
import { isMapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { isFetchMemberDataByAuthTokenResponse } from "./AdminApi";
import { isWokaDetail, wokaList, wokaTexture } from "../Messages/JsonMessages/PlayerTextures";
import { SchemaObject } from "openapi3-ts";

class SwaggerGenerator {
    definitions(type: string | null): {
        definitions: { [K: string]: SchemaObject };
    } {
        const definitions = {
            definitions: {
                AdminApiLoginUrlData: generateSchema(isAdminApiLoginUrlData),
                ErrorApiUnauthorizedData: generateSchema(isErrorApiUnauthorizedData),
                FetchMemberDataByUuidResponse: generateSchema(isFetchMemberDataByAuthTokenResponse),
                MapDetailsData: generateSchema(isMapDetailsData),
                WokaDetail: generateSchema(isWokaDetail),
            },
        };
        if (type === "external") {
            return definitions;
        }
        return {
            definitions: {
                AdminApiLoginUrlData: generateSchema(isAdminApiLoginUrlData),
                ErrorApiErrorData: generateSchema(isErrorApiErrorData),
                ErrorApiRedirectData: generateSchema(isErrorApiRedirectData),
                ErrorApiRetryData: generateSchema(isErrorApiRetryData),
                ErrorApiUnauthorizedData: generateSchema(isErrorApiUnauthorizedData),
                FetchMemberDataByUuidResponse: generateSchema(isFetchMemberDataByAuthTokenResponse),
                MapDetailsData: generateSchema(isMapDetailsData),
                WokaDetail: generateSchema(isWokaDetail),
                WokaList: generateSchema(wokaList),
                WokaTexture: generateSchema(wokaTexture),
            },
        };
    }
}

export default new SwaggerGenerator();
