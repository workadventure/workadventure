import type { ErrorApiData } from "../../../messages/JsonMessages/ErrorApiData";

export class ApiError extends Error {
    static NAME = "ApiError";

    constructor(public readonly errorApiData: ErrorApiData) {
        super("The API returned an error");
        this.name = ApiError.NAME;
    }
}
