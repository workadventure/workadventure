import type { ErrorApiData } from "@workadventure/messages";

export class ApiError extends Error {
    static NAME = "ApiError";

    constructor(public readonly errorApiData: ErrorApiData) {
        super("The API returned an error");
        this.name = ApiError.NAME;
    }
}
